import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  CreateReviewRequest,
  MyReviewsResponse,
  ReviewItem,
  UpdateReviewRequest,
} from "@haetteum/contracts";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

export const REVIEW_SELECT = {
  id: true,
  placeId: true,
  rating: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  place: {
    select: {
      title: true,
      primaryImageUrl: true,
      region: { select: { name: true } },
      district: { select: { name: true } },
    },
  },
} satisfies Prisma.ReviewSelect;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof REVIEW_SELECT }>;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string): Promise<MyReviewsResponse> {
    const rows = await this.prisma.review.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: REVIEW_SELECT,
    });

    return { items: rows.map(mapReviewRow) };
  }

  async findMine(userId: string, reviewId: string): Promise<ReviewItem> {
    const row = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
      select: REVIEW_SELECT,
    });
    if (row === null) {
      throw new NotFoundException({
        code: "REVIEW_NOT_FOUND",
        detail: "후기를 찾을 수 없습니다.",
      });
    }

    return mapReviewRow(row);
  }

  async create(
    userId: string,
    input: CreateReviewRequest,
  ): Promise<ReviewItem> {
    const place = await this.prisma.place.findUnique({
      where: { id: input.placeId, isVisible: true },
      select: { id: true },
    });
    if (place === null) {
      throw new NotFoundException({
        code: "PLACE_NOT_FOUND",
        detail: "장소를 찾을 수 없습니다.",
      });
    }

    try {
      return mapReviewRow(
        await this.prisma.review.create({
          data: { userId, ...input },
          select: REVIEW_SELECT,
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException({
          code: "REVIEW_ALREADY_EXISTS",
          detail: "이미 해당 장소에 후기를 작성했습니다.",
        });
      }

      throw error;
    }
  }

  async update(
    userId: string,
    reviewId: string,
    input: UpdateReviewRequest,
  ): Promise<ReviewItem> {
    const existingReview = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
      select: { id: true },
    });
    if (existingReview === null) {
      throw new NotFoundException({
        code: "REVIEW_NOT_FOUND",
        detail: "후기를 찾을 수 없습니다.",
      });
    }

    return mapReviewRow(
      await this.prisma.review.update({
        where: { id: reviewId, userId },
        data: { rating: input.rating, content: input.content },
        select: REVIEW_SELECT,
      }),
    );
  }
}

function mapReviewRow(row: ReviewRow): ReviewItem {
  return {
    id: row.id,
    placeId: row.placeId,
    placeTitle: row.place.title,
    location: [row.place.region.name, row.place.district?.name]
      .filter((value): value is string => value !== undefined)
      .join(" "),
    rating: row.rating,
    content: row.content,
    primaryImageUrl: row.place.primaryImageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
