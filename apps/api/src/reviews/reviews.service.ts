import { unlink } from "node:fs/promises";
import { basename, join } from "node:path";

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  CreateReviewRequest,
  MyReviewsResponse,
  PlaceReviewItem,
  PlaceReviewRatingBucket,
  PlaceReviewsResponse,
  ReviewItem,
  UpdateReviewRequest,
} from "@haetteum/contracts";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  REVIEW_UPLOADS_DIR,
  REVIEW_UPLOADS_URL_PREFIX,
} from "./review-images.constants.js";

export const REVIEW_SELECT = {
  id: true,
  placeId: true,
  rating: true,
  title: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: { sortOrder: "asc" },
    select: { url: true },
  },
  place: {
    select: {
      title: true,
      primaryImageUrl: true,
      region: { select: { name: true } },
      district: { select: { name: true } },
    },
  },
} satisfies Prisma.ReviewSelect;

export const PLACE_REVIEW_SELECT = {
  id: true,
  rating: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { displayName: true, profileImageUrl: true } },
} satisfies Prisma.ReviewSelect;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof REVIEW_SELECT }>;
type PlaceReviewRow = Prisma.ReviewGetPayload<{
  select: typeof PLACE_REVIEW_SELECT;
}>;

const RATING_SCORES = [5, 4, 3, 2, 1] as const;

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

  /**
   * 관광지 상세 후기 탭이 쓰는 공개 목록이다.
   * 로그인 없이 열람할 수 있어야 하므로 작성자는 표시 이름과 프로필 이미지만 노출한다.
   */
  async listForPlace(placeId: string): Promise<PlaceReviewsResponse> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId, isVisible: true },
      select: { id: true },
    });
    if (place === null) {
      throw new NotFoundException({
        code: "PLACE_NOT_FOUND",
        detail: "장소를 찾을 수 없습니다.",
      });
    }

    const [rows, grouped] = await Promise.all([
      this.prisma.review.findMany({
        where: { placeId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: PLACE_REVIEW_SELECT,
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where: { placeId },
        _count: { _all: true },
      }),
    ]);

    const countByScore = new Map(
      grouped.map((bucket) => [bucket.rating, bucket._count._all]),
    );
    const ratingDistribution: PlaceReviewRatingBucket[] = RATING_SCORES.map(
      (score) => ({ score, count: countByScore.get(score) ?? 0 }),
    );
    const reviewCount = ratingDistribution.reduce(
      (total, bucket) => total + bucket.count,
      0,
    );
    const ratingTotal = ratingDistribution.reduce(
      (total, bucket) => total + bucket.score * bucket.count,
      0,
    );

    return {
      placeId,
      reviewCount,
      averageRating:
        reviewCount === 0
          ? null
          : Math.round((ratingTotal / reviewCount) * 10) / 10,
      ratingDistribution,
      items: rows.map(mapPlaceReviewRow),
    };
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
          data: {
            userId,
            placeId: input.placeId,
            rating: input.rating,
            title: input.title,
            content: input.content,
            images: {
              create: input.images.map((url, index) => ({
                url,
                sortOrder: index,
              })),
            },
          },
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
      select: { images: { select: { url: true } } },
    });
    if (existingReview === null) {
      throw new NotFoundException({
        code: "REVIEW_NOT_FOUND",
        detail: "후기를 찾을 수 없습니다.",
      });
    }

    const updated = mapReviewRow(
      await this.prisma.review.update({
        where: { id: reviewId, userId },
        data: {
          rating: input.rating,
          title: input.title,
          content: input.content,
          images: {
            deleteMany: {},
            create: input.images.map((url, index) => ({
              url,
              sortOrder: index,
            })),
          },
        },
        select: REVIEW_SELECT,
      }),
    );

    await deleteUploadedImages(existingReview.images.map((image) => image.url));
    return updated;
  }

  async remove(userId: string, reviewId: string): Promise<void> {
    const existingReview = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
      select: { images: { select: { url: true } } },
    });
    await this.prisma.review.deleteMany({ where: { id: reviewId, userId } });
    if (existingReview !== null) {
      await deleteUploadedImages(existingReview.images.map((image) => image.url));
    }
  }
}

/// 로컬 디스크에 저장된 업로드 파일을 best-effort로 정리한다. 실패해도 요청 자체는 성공으로 처리한다.
async function deleteUploadedImages(urls: readonly string[]): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      const index = url.indexOf(REVIEW_UPLOADS_URL_PREFIX);
      if (index === -1) return;

      const filePath = join(
        REVIEW_UPLOADS_DIR,
        basename(url.slice(index + REVIEW_UPLOADS_URL_PREFIX.length)),
      );
      try {
        await unlink(filePath);
      } catch {
        // 파일이 이미 없거나 접근할 수 없어도 무시한다.
      }
    }),
  );
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
    title: row.title,
    content: row.content,
    images: row.images.map((image) => image.url),
    primaryImageUrl: row.place.primaryImageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPlaceReviewRow(row: PlaceReviewRow): PlaceReviewItem {
  return {
    id: row.id,
    rating: row.rating,
    content: row.content,
    author: {
      displayName: row.user.displayName,
      profileImageUrl: row.user.profileImageUrl,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
