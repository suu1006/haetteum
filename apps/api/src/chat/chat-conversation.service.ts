import { Injectable, NotFoundException } from "@nestjs/common";

import { type Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

const TITLE_MAX_LENGTH = 80;

export type ChatConversationSummaryRow = {
  id: string;
  title: string;
  updatedAt: Date;
  preview: string;
};

function conversationNotFound(): NotFoundException {
  return new NotFoundException({
    code: "CHAT_CONVERSATION_NOT_FOUND",
    detail: "대화를 찾을 수 없습니다.",
  });
}

@Injectable()
export class ChatConversationService {
  constructor(private readonly prisma: PrismaService) {}

  static titleFrom(latestUserMessage: string): string {
    const trimmed = latestUserMessage.trim();
    return trimmed.length > TITLE_MAX_LENGTH
      ? `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`
      : trimmed;
  }

  async resolve(
    tx: Prisma.TransactionClient,
    userId: string,
    conversationId: string | undefined,
    latestUserMessage: string,
  ): Promise<string> {
    if (conversationId) {
      const existing = await tx.chatConversation.findUnique({
        where: { id: conversationId },
        select: { userId: true },
      });
      if (!existing || existing.userId !== userId) throw conversationNotFound();
      return conversationId;
    }
    const created = await tx.chatConversation.create({
      data: {
        userId,
        title: ChatConversationService.titleFrom(latestUserMessage),
      },
      select: { id: true },
    });
    return created.id;
  }

  async appendExchange(
    tx: Prisma.TransactionClient,
    conversationId: string,
    userContent: string,
    assistantReply: string,
  ): Promise<void> {
    // 같은 밀리초에 두 행이 들어가면 목록 미리보기가 어느 쪽을 고를지 알 수 없어
    // 저장 시각을 명시적으로 1ms 벌려 둔다.
    const userCreatedAt = new Date();
    const assistantCreatedAt = new Date(userCreatedAt.getTime() + 1);
    await tx.chatMessage.createMany({
      data: [
        {
          conversationId,
          role: "user",
          content: userContent,
          createdAt: userCreatedAt,
        },
        {
          conversationId,
          role: "assistant",
          content: assistantReply,
          createdAt: assistantCreatedAt,
        },
      ],
    });
    await tx.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  async listForUser(
    userId: string,
    { cursor, limit }: { cursor?: number; limit: number },
  ): Promise<{
    items: ChatConversationSummaryRow[];
    nextCursor: number | null;
  }> {
    const offset = cursor ?? 0;
    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId, messages: { some: {} } },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit + 1,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const page = conversations.slice(0, limit);
    return {
      items: page.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        preview: conversation.messages[0]?.content ?? "",
      })),
      nextCursor: conversations.length > limit ? offset + limit : null,
    };
  }

  async getMessages(
    userId: string,
    conversationId: string,
  ): Promise<{ role: string; content: string }[]> {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });
    if (!conversation || conversation.userId !== userId)
      throw conversationNotFound();
    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
  }
}
