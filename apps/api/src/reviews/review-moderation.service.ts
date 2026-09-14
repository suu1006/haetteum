import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  BlockedUsersResponse,
  ReviewReportRequest,
} from "@haetteum/contracts";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ReviewModerationService {
  constructor(private readonly prisma: PrismaService) {}

  private async otherReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { userId: true, title: true, content: true },
    });
    if (!review)
      throw new NotFoundException({
        code: "REVIEW_NOT_FOUND",
        detail: "후기를 찾을 수 없습니다.",
      });
    if (review.userId === userId)
      throw new BadRequestException({
        code: "SELF_MODERATION",
        detail: "본인의 후기는 신고하거나 차단할 수 없습니다.",
      });
    return review;
  }

  async report(
    userId: string,
    reviewId: string,
    input: ReviewReportRequest,
  ): Promise<void> {
    const review = await this.otherReview(userId, reviewId);
    try {
      await this.prisma.reviewReport.create({
        data: {
          reporterId: userId,
          reviewIdSnapshot: reviewId,
          authorIdSnapshot: review.userId,
          reviewId,
          ...input,
          contentSnapshot: review.content,
          titleSnapshot: review.title,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException({
          code: "ALREADY_REPORTED",
          detail: "이미 신고한 후기입니다.",
        });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      )
        throw new NotFoundException({
          code: "REVIEW_NOT_FOUND",
          detail: "후기를 찾을 수 없습니다.",
        });
      throw error;
    }
  }

  async blockAuthor(userId: string, reviewId: string): Promise<void> {
    const review = await this.otherReview(userId, reviewId);
    // Database ON CONFLICT makes concurrent/repeated requests idempotent.
    await this.prisma.userBlock.createMany({
      data: [{ blockerId: userId, blockedUserId: review.userId }],
      skipDuplicates: true,
    });
  }

  async listBlocks(userId: string): Promise<BlockedUsersResponse> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: [{ createdAt: "desc" }, { blockedUserId: "asc" }],
      select: {
        blockedUserId: true,
        createdAt: true,
        blockedUser: { select: { displayName: true } },
      },
    });
    return {
      items: rows.map((row) => ({
        userId: row.blockedUserId,
        displayName: row.blockedUser.displayName,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async unblock(userId: string, blockedUserId: string): Promise<void> {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId: userId, blockedUserId },
    });
  }
}
