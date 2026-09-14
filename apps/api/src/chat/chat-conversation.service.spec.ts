import { jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import { ChatConversationService } from "./chat-conversation.service.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";

function txMock() {
  return {
    chatConversation: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    chatMessage: {
      createMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };
}

describe("ChatConversationService.resolve", () => {
  it("creates a new conversation with a title from the first message when no id is given", async () => {
    const tx = txMock();
    tx.chatConversation.create.mockResolvedValue({ id: CONVERSATION_ID });
    const service = new ChatConversationService({} as never);

    const conversationId = await service.resolve(
      tx as never,
      USER_ID,
      undefined,
      "서울 당일치기 코스 추천해줘",
    );

    expect(conversationId).toBe(CONVERSATION_ID);
    expect(tx.chatConversation.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, title: "서울 당일치기 코스 추천해줘" },
      select: { id: true },
    });
  });

  it("truncates a long first message into an 80-character title", async () => {
    const tx = txMock();
    tx.chatConversation.create.mockResolvedValue({ id: CONVERSATION_ID });
    const service = new ChatConversationService({} as never);
    const longMessage = "가".repeat(100);

    await service.resolve(tx as never, USER_ID, undefined, longMessage);

    expect(tx.chatConversation.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, title: `${"가".repeat(79)}…` },
      select: { id: true },
    });
  });

  it("reuses an existing conversation owned by the caller", async () => {
    const tx = txMock();
    tx.chatConversation.findUnique.mockResolvedValue({ userId: USER_ID });
    const service = new ChatConversationService({} as never);

    const conversationId = await service.resolve(
      tx as never,
      USER_ID,
      CONVERSATION_ID,
      "다음 질문",
    );

    expect(conversationId).toBe(CONVERSATION_ID);
    expect(tx.chatConversation.create).not.toHaveBeenCalled();
  });

  it("rejects a conversation id owned by another user", async () => {
    const tx = txMock();
    tx.chatConversation.findUnique.mockResolvedValue({ userId: OTHER_USER_ID });
    const service = new ChatConversationService({} as never);

    await expect(
      service.resolve(tx as never, USER_ID, CONVERSATION_ID, "다음 질문"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a conversation id that does not exist", async () => {
    const tx = txMock();
    tx.chatConversation.findUnique.mockResolvedValue(null);
    const service = new ChatConversationService({} as never);

    await expect(
      service.resolve(tx as never, USER_ID, CONVERSATION_ID, "다음 질문"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ChatConversationService.appendExchange", () => {
  it("stores the user question and assistant reply and bumps updatedAt", async () => {
    const tx = txMock();
    const service = new ChatConversationService({} as never);

    await service.appendExchange(tx as never, CONVERSATION_ID, "질문", "답변");

    expect(tx.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        {
          conversationId: CONVERSATION_ID,
          role: "user",
          content: "질문",
          createdAt: expect.any(Date) as Date,
        },
        {
          conversationId: CONVERSATION_ID,
          role: "assistant",
          content: "답변",
          createdAt: expect.any(Date) as Date,
        },
      ],
    });
    expect(tx.chatConversation.update).toHaveBeenCalledWith({
      where: { id: CONVERSATION_ID },
      data: { updatedAt: expect.any(Date) as Date },
    });
  });

  it("orders the assistant reply strictly after the user question", async () => {
    const tx = txMock();
    const service = new ChatConversationService({} as never);

    await service.appendExchange(tx as never, CONVERSATION_ID, "질문", "답변");

    const { data } = (
      tx.chatMessage.createMany.mock.calls[0] as [
        { data: { role: string; createdAt: Date }[] },
      ]
    )[0];
    const [userRow, assistantRow] = data;
    expect(userRow.role).toBe("user");
    expect(assistantRow.role).toBe("assistant");
    expect(assistantRow.createdAt.getTime()).toBeGreaterThan(
      userRow.createdAt.getTime(),
    );
  });
});

describe("ChatConversationService.listForUser", () => {
  it("returns a nextCursor only when more rows remain", async () => {
    const findMany = jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue(
        Array.from({ length: 2 }, (_, i) => ({
          id: `conv-${i}`,
          title: `대화 ${i}`,
          updatedAt: new Date("2026-09-14T00:00:00.000Z"),
          messages: [{ content: `최근 메시지 ${i}` }],
        })),
      );
    const service = new ChatConversationService({
      chatConversation: { findMany },
    } as never);

    const result = await service.listForUser(USER_ID, { limit: 1 });

    expect(result.items).toEqual([
      {
        id: "conv-0",
        title: "대화 0",
        updatedAt: new Date("2026-09-14T00:00:00.000Z"),
        preview: "최근 메시지 0",
      },
    ]);
    expect(result.nextCursor).toBe(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, messages: { some: {} } },
        skip: 0,
        take: 2,
      }),
    );
  });

  it("excludes conversations that have no messages yet", async () => {
    const findMany = jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue([]);
    const service = new ChatConversationService({
      chatConversation: { findMany },
    } as never);

    await service.listForUser(USER_ID, { limit: 12 });

    const [args] = findMany.mock.calls[0] as [{ where: unknown }];
    expect(args.where).toEqual({
      userId: USER_ID,
      messages: { some: {} },
    });
  });

  it("returns a null nextCursor on the last page", async () => {
    const findMany = jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue([
        { id: "conv-0", title: "대화 0", updatedAt: new Date(), messages: [] },
      ]);
    const service = new ChatConversationService({
      chatConversation: { findMany },
    } as never);

    const result = await service.listForUser(USER_ID, { limit: 12 });

    expect(result.nextCursor).toBeNull();
    expect(result.items[0].preview).toBe("");
  });
});

describe("ChatConversationService.getMessages", () => {
  it("returns messages in chronological order for the owner", async () => {
    const findUnique = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ userId: USER_ID });
    const findMany = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue([{ role: "user", content: "안녕" }]);
    const service = new ChatConversationService({
      chatConversation: { findUnique },
      chatMessage: { findMany },
    } as never);

    const messages = await service.getMessages(USER_ID, CONVERSATION_ID);

    expect(messages).toEqual([{ role: "user", content: "안녕" }]);
    expect(findMany).toHaveBeenCalledWith({
      where: { conversationId: CONVERSATION_ID },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
  });

  it("rejects a conversation not owned by the caller with 404", async () => {
    const findUnique = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ userId: OTHER_USER_ID });
    const service = new ChatConversationService({
      chatConversation: { findUnique },
    } as never);

    await expect(
      service.getMessages(USER_ID, CONVERSATION_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
