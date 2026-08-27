import { ConflictException, NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import type {
  CreateReviewRequest,
  UpdateReviewRequest,
} from "@haetteum/contracts";

import { Prisma } from "../generated/prisma/client.js";
import { REVIEW_SELECT, ReviewsService } from "./reviews.service.js";

const REVIEW_ID = "10000000-0000-4000-8000-000000000001";
const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const USER_ID = "30000000-0000-4000-8000-000000000001";
const createInput: CreateReviewRequest = {
  placeId: PLACE_ID,
  rating: 5,
  content: "다시 방문하고 싶은 곳이에요.",
};
const updateInput: UpdateReviewRequest = {
  rating: 4,
  content: "수정한 후기",
};

function reviewRow(districtName: string | null = "용인") {
  return {
    id: REVIEW_ID,
    placeId: PLACE_ID,
    rating: 5,
    content: "다시 방문하고 싶은 곳이에요.",
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
          content: "다시 방문하고 싶은 곳이에요.",
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
      content: "다시 방문하고 싶은 곳이에요.",
    });
    expect(placeFindUnique).toHaveBeenCalledWith({
      where: { id: createInput.placeId, isVisible: true },
      select: { id: true },
    });
    expect(reviewCreate).toHaveBeenCalledWith({
      data: { userId: USER_ID, ...createInput },
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
    const row = { ...reviewRow(), ...updateInput };
    const findFirst = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValue({ id: REVIEW_ID });
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
      content: "수정한 후기",
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: REVIEW_ID, userId: USER_ID },
      select: { id: true },
    });
    expect(reviewUpdate).toHaveBeenCalledWith({
      where: { id: REVIEW_ID, userId: USER_ID },
      data: { rating: 4, content: "수정한 후기" },
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
});
