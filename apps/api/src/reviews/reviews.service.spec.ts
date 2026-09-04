import { ConflictException, NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import type {
  CreateReviewRequest,
  UpdateReviewRequest,
} from "@haetteum/contracts";

import { Prisma } from "../generated/prisma/client.js";
import {
  PLACE_REVIEW_SELECT,
  REVIEW_SELECT,
  ReviewsService,
} from "./reviews.service.js";

const REVIEW_ID = "10000000-0000-4000-8000-000000000001";
const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const USER_ID = "30000000-0000-4000-8000-000000000001";
const createInput: CreateReviewRequest = {
  placeId: PLACE_ID,
  rating: 5,
  title: "다시 오고 싶어요",
  content: "다시 방문하고 싶은 곳이에요.",
  images: ["https://example.test/uploads/reviews/photo-1.jpg"],
};
const updateInput: UpdateReviewRequest = {
  rating: 4,
  title: "수정한 제목",
  content: "수정한 후기 본문입니다.",
  images: [],
};

function reviewRow(districtName: string | null = "용인") {
  return {
    id: REVIEW_ID,
    placeId: PLACE_ID,
    rating: 5,
    title: "다시 오고 싶어요",
    content: "다시 방문하고 싶은 곳이에요.",
    images: [{ url: "https://example.test/uploads/reviews/photo-1.jpg" }],
    createdAt: new Date("2026-08-25T03:00:00.000Z"),
    updatedAt: new Date("2026-08-26T03:00:00.000Z"),
    place: {
      title: "에버랜드",
      primaryImageUrl: "https://example.test/everland.jpg",
      region: { name: "경기" },
      district: districtName === null ? null : { name: districtName },
    },
  };
}

describe("ReviewsService", () => {
  it("lists the passed user's reviews in deterministic recency order with place display data", async () => {
    const row = reviewRow();
    const findMany = jest
      .fn<() => Promise<(typeof row)[]>>()
      .mockResolvedValue([row]);
    const service = new ReviewsService({ review: { findMany } } as never);

    await expect(service.listMine(USER_ID)).resolves.toEqual({
      items: [
        {
          id: REVIEW_ID,
          placeId: PLACE_ID,
          placeTitle: "에버랜드",
          location: "경기 용인",
          rating: 5,
          title: "다시 오고 싶어요",
          content: "다시 방문하고 싶은 곳이에요.",
          images: ["https://example.test/uploads/reviews/photo-1.jpg"],
          primaryImageUrl: "https://example.test/everland.jpg",
          createdAt: "2026-08-25T03:00:00.000Z",
          updatedAt: "2026-08-26T03:00:00.000Z",
        },
      ],
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: REVIEW_SELECT,
    });
  });

  it("uses the region name when a review's place has no district", async () => {
    const row = reviewRow(null);
    const findMany = jest
      .fn<() => Promise<(typeof row)[]>>()
      .mockResolvedValue([row]);
    const service = new ReviewsService({ review: { findMany } } as never);

    await expect(service.listMine(USER_ID)).resolves.toMatchObject({
      items: [{ location: "경기" }],
    });
  });

  it("returns a review only when the passed user owns it", async () => {
    const row = reviewRow();
    const findFirst = jest
      .fn<() => Promise<typeof row | null>>()
      .mockResolvedValue(row);
    const service = new ReviewsService({ review: { findFirst } } as never);

    await expect(service.findMine(USER_ID, REVIEW_ID)).resolves.toMatchObject({
      id: REVIEW_ID,
      placeId: PLACE_ID,
      placeTitle: "에버랜드",
      location: "경기 용인",
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: REVIEW_ID, userId: USER_ID },
      select: REVIEW_SELECT,
    });
  });

  it("hides a missing or foreign review behind the same safe 404", async () => {
    const findFirst = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const service = new ReviewsService({ review: { findFirst } } as never);

    await expect(service.findMine(USER_ID, REVIEW_ID)).rejects.toEqual(
      new NotFoundException({
        code: "REVIEW_NOT_FOUND",
        detail: "후기를 찾을 수 없습니다.",
      }),
    );
  });

  it("creates a review for a visible place with the passed user as owner", async () => {
    const row = reviewRow();
    const placeFindUnique = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValue({ id: PLACE_ID });
    const reviewCreate = jest
      .fn<() => Promise<typeof row>>()
      .mockResolvedValue(row);
    const service = new ReviewsService({
      place: { findUnique: placeFindUnique },
      review: { create: reviewCreate },
    } as never);

    await expect(service.create(USER_ID, createInput)).resolves.toMatchObject({
      id: REVIEW_ID,
      placeId: PLACE_ID,
      rating: 5,
      title: "다시 오고 싶어요",
      content: "다시 방문하고 싶은 곳이에요.",
      images: ["https://example.test/uploads/reviews/photo-1.jpg"],
    });
    expect(placeFindUnique).toHaveBeenCalledWith({
      where: { id: createInput.placeId, isVisible: true },
      select: { id: true },
    });
    expect(reviewCreate).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        placeId: PLACE_ID,
        rating: 5,
        title: "다시 오고 싶어요",
        content: "다시 방문하고 싶은 곳이에요.",
        images: {
          create: [
            { url: "https://example.test/uploads/reviews/photo-1.jpg", sortOrder: 0 },
          ],
        },
      },
      select: REVIEW_SELECT,
    });
  });

  it("rejects a missing or hidden review place without attempting a create", async () => {
    const placeFindUnique = jest
      .fn<() => Promise<null>>()
      .mockResolvedValue(null);
    const reviewCreate = jest.fn();
    const service = new ReviewsService({
      place: { findUnique: placeFindUnique },
      review: { create: reviewCreate },
    } as never);

    await expect(service.create(USER_ID, createInput)).rejects.toEqual(
      new NotFoundException({
        code: "PLACE_NOT_FOUND",
        detail: "장소를 찾을 수 없습니다.",
      }),
    );
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it("maps only a known duplicate-review constraint error to a safe conflict", async () => {
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      "duplicate review",
      { code: "P2002", clientVersion: "7.9.1" },
    );
    const placeFindUnique = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValue({ id: PLACE_ID });
    const reviewCreate = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue(duplicateError);
    const service = new ReviewsService({
      place: { findUnique: placeFindUnique },
      review: { create: reviewCreate },
    } as never);

    await expect(service.create(USER_ID, createInput)).rejects.toEqual(
      new ConflictException({
        code: "REVIEW_ALREADY_EXISTS",
        detail: "이미 해당 장소에 후기를 작성했습니다.",
      }),
    );
  });

  it("rethrows a non-duplicate Prisma error", async () => {
    const originalError = new Prisma.PrismaClientKnownRequestError(
      "foreign key failure",
      { code: "P2003", clientVersion: "7.9.1" },
    );
    const placeFindUnique = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValue({ id: PLACE_ID });
    const reviewCreate = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue(originalError);
    const service = new ReviewsService({
      place: { findUnique: placeFindUnique },
      review: { create: reviewCreate },
    } as never);

    await expect(service.create(USER_ID, createInput)).rejects.toBe(
      originalError,
    );
  });

  it("updates only a review owned by the passed user", async () => {
    const row = { ...reviewRow(), ...updateInput, images: [] };
    const findFirst = jest
      .fn<() => Promise<{ images: { url: string }[] } | null>>()
      .mockResolvedValue({
        images: [{ url: "https://example.test/uploads/reviews/photo-1.jpg" }],
      });
    const reviewUpdate = jest
      .fn<() => Promise<typeof row>>()
      .mockResolvedValue(row);
    const service = new ReviewsService({
      review: { findFirst, update: reviewUpdate },
    } as never);

    await expect(
      service.update(USER_ID, REVIEW_ID, updateInput),
    ).resolves.toMatchObject({
      id: REVIEW_ID,
      rating: 4,
      title: "수정한 제목",
      content: "수정한 후기 본문입니다.",
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: REVIEW_ID, userId: USER_ID },
      select: { images: { select: { url: true } } },
    });
    expect(reviewUpdate).toHaveBeenCalledWith({
      where: { id: REVIEW_ID, userId: USER_ID },
      data: {
        rating: 4,
        title: "수정한 제목",
        content: "수정한 후기 본문입니다.",
        images: { deleteMany: {}, create: [] },
      },
      select: REVIEW_SELECT,
    });
  });

  it("hides a missing or foreign review before attempting an update", async () => {
    const findFirst = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const reviewUpdate = jest.fn();
    const service = new ReviewsService({
      review: { findFirst, update: reviewUpdate },
    } as never);

    await expect(
      service.update(USER_ID, REVIEW_ID, updateInput),
    ).rejects.toEqual(
      new NotFoundException({
        code: "REVIEW_NOT_FOUND",
        detail: "후기를 찾을 수 없습니다.",
      }),
    );
    expect(reviewUpdate).not.toHaveBeenCalled();
  });

  it("deletes only a review owned by the passed user", async () => {
    const findFirst = jest
      .fn<() => Promise<{ images: { url: string }[] } | null>>()
      .mockResolvedValue({ images: [] });
    const deleteMany = jest
      .fn<() => Promise<{ count: number }>>()
      .mockResolvedValue({ count: 1 });
    const service = new ReviewsService({
      review: { findFirst, deleteMany },
    } as never);

    await service.remove(USER_ID, REVIEW_ID);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: REVIEW_ID, userId: USER_ID },
    });
  });
});

describe("ReviewsService.listForPlace", () => {
  function placeReviewRow(rating: number, displayName = "정수") {
    return {
      id: REVIEW_ID,
      rating,
      content: "분단의 현실이 실감나는 곳이었어요.",
      createdAt: new Date("2026-08-25T03:00:00.000Z"),
      updatedAt: new Date("2026-08-26T03:00:00.000Z"),
      user: {
        displayName,
        profileImageUrl: "https://example.test/avatar.jpg",
      },
    };
  }

  it("throws when the place is missing or hidden", async () => {
    const service = new ReviewsService({
      place: {
        findUnique: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      },
    } as never);

    await expect(service.listForPlace(PLACE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns an empty summary with a null average when no review exists", async () => {
    const service = new ReviewsService({
      place: {
        findUnique: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({ id: PLACE_ID }),
      },
      review: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      },
    } as never);

    await expect(service.listForPlace(PLACE_ID)).resolves.toEqual({
      placeId: PLACE_ID,
      reviewCount: 0,
      averageRating: null,
      ratingDistribution: [
        { score: 5, count: 0 },
        { score: 4, count: 0 },
        { score: 3, count: 0 },
        { score: 2, count: 0 },
        { score: 1, count: 0 },
      ],
      items: [],
    });
  });

  it("summarizes the ratings and exposes only the author's public profile", async () => {
    const findMany = jest
      .fn<() => Promise<unknown[]>>()
      .mockResolvedValue([placeReviewRow(5), placeReviewRow(4, "haetteum")]);
    const service = new ReviewsService({
      place: {
        findUnique: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({ id: PLACE_ID }),
      },
      review: {
        findMany,
        groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
          { rating: 5, _count: { _all: 2 } },
          { rating: 4, _count: { _all: 1 } },
        ]),
      },
    } as never);

    const result = await service.listForPlace(PLACE_ID);

    expect(result.reviewCount).toBe(3);
    expect(result.averageRating).toBe(4.7);
    expect(result.ratingDistribution).toEqual([
      { score: 5, count: 2 },
      { score: 4, count: 1 },
      { score: 3, count: 0 },
      { score: 2, count: 0 },
      { score: 1, count: 0 },
    ]);
    expect(result.items[0]).toEqual({
      id: REVIEW_ID,
      rating: 5,
      content: "분단의 현실이 실감나는 곳이었어요.",
      author: {
        displayName: "정수",
        profileImageUrl: "https://example.test/avatar.jpg",
      },
      createdAt: "2026-08-25T03:00:00.000Z",
      updatedAt: "2026-08-26T03:00:00.000Z",
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { placeId: PLACE_ID },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: PLACE_REVIEW_SELECT,
    });
  });

  it("never selects the reviewer's identity beyond display name and avatar", () => {
    expect(PLACE_REVIEW_SELECT.user.select).toEqual({
      displayName: true,
      profileImageUrl: true,
    });
  });
});
