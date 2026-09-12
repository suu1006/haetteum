import { RequestMethod, type ExecutionContext } from "@nestjs/common";
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import {
  CreateReviewRequestSchema,
  MyReviewsResponseSchema,
  ReviewIdParamsSchema,
  ReviewItemSchema,
  UpdateReviewRequestSchema,
  type CreateReviewRequest,
  type MyReviewsResponse,
  type ReviewIdParams,
  type ReviewItem,
  type UpdateReviewRequest,
} from "@haetteum/contracts";
import type { AuthUser } from "@haetteum/contracts";

import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { ReviewsController } from "./reviews.controller.js";

const REVIEW_ID = "10000000-0000-4000-8000-000000000001";
const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const review: ReviewItem = {
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
};
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
const currentUser: AuthUser = {
  id: "30000000-0000-4000-8000-000000000001",
  displayName: "로그인 여행자",
  profileImageUrl: null,
  provider: "KAKAO",
};

function validationPipe(
  method: keyof ReviewsController,
  index: number,
): ZodValidationPipe<unknown> {
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    ReviewsController,
    method,
  ) as Record<string, { index: number; pipes: unknown[] }>;
  const argument = Object.values(args).find((value) => value.index === index);

  return argument?.pipes[0] as ZodValidationPipe<unknown>;
}

function handler(
  method: keyof ReviewsController,
): (...args: unknown[]) => unknown {
  return Object.getOwnPropertyDescriptor(ReviewsController.prototype, method)
    ?.value as (...args: unknown[]) => unknown;
}

describe("ReviewsController", () => {
  it("delegates each validated request shape to the matching review service method", async () => {
    const response: MyReviewsResponse = { items: [review] };
    const reviews = {
      listMine: jest
        .fn<(userId: string) => Promise<MyReviewsResponse>>()
        .mockResolvedValue(response),
      findMine: jest
        .fn<(userId: string, reviewId: string) => Promise<ReviewItem>>()
        .mockResolvedValue(review),
      create: jest
        .fn<
          (userId: string, input: CreateReviewRequest) => Promise<ReviewItem>
        >()
        .mockResolvedValue(review),
      update: jest
        .fn<
          (
            userId: string,
            reviewId: string,
            input: UpdateReviewRequest,
          ) => Promise<ReviewItem>
        >()
        .mockResolvedValue({ ...review, ...updateInput }),
      remove: jest
        .fn<(userId: string, reviewId: string) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    const controller = new ReviewsController(reviews as never);
    const params: ReviewIdParams = { reviewId: REVIEW_ID };

    await expect(controller.listMine(currentUser)).resolves.toEqual(response);
    await expect(controller.findMine(currentUser, params)).resolves.toEqual(
      review,
    );
    await expect(controller.create(currentUser, createInput)).resolves.toEqual(
      review,
    );
    await expect(
      controller.update(currentUser, params, updateInput),
    ).resolves.toEqual({
      ...review,
      ...updateInput,
    });
    await expect(
      controller.remove(currentUser, params),
    ).resolves.toBeUndefined();

    expect(reviews.listMine).toHaveBeenCalledWith(currentUser.id);
    expect(reviews.findMine).toHaveBeenCalledWith(currentUser.id, REVIEW_ID);
    expect(reviews.create).toHaveBeenCalledWith(currentUser.id, createInput);
    expect(reviews.update).toHaveBeenCalledWith(
      currentUser.id,
      REVIEW_ID,
      updateInput,
    );
    expect(reviews.remove).toHaveBeenCalledWith(currentUser.id, REVIEW_ID);
  });

  it("registers the versioned review routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ReviewsController)).toBe(
      "reviews",
    );
    expect(Reflect.getMetadata(VERSION_METADATA, ReviewsController)).toBe("1");

    expect(Reflect.getMetadata(PATH_METADATA, handler("listMine"))).toBe(
      "mine",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("listMine"))).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("findMine"))).toBe(
      ":reviewId",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("findMine"))).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("create"))).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, handler("create"))).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("update"))).toBe(
      ":reviewId",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("update"))).toBe(
      RequestMethod.PATCH,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("remove"))).toBe(
      ":reviewId",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("remove"))).toBe(
      RequestMethod.DELETE,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("remove"))).toBe(
      204,
    );
  });

  it("requires the session and same-origin guards for every review route", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ReviewsController)).toEqual([
      SessionAuthGuard,
      SameOriginGuard,
    ]);
  });

  it("receives the authenticated user through CurrentUser on every route", () => {
    for (const [method, index] of [
      ["listMine", 0],
      ["findMine", 0],
      ["create", 0],
      ["update", 0],
      ["remove", 0],
    ] as const) {
      const args = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        ReviewsController,
        method,
      ) as Record<
        string,
        {
          index: number;
          factory?: (data: unknown, context: ExecutionContext) => unknown;
        }
      >;
      const argument = Object.values(args).find(
        (value) => value.index === index,
      );
      const factory = argument?.factory;
      if (!factory)
        throw new Error(`Missing CurrentUser metadata on ${method}`);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            body: { userId: "99999999-0000-4000-8000-000000000001" },
            auth: { user: currentUser },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(factory(undefined, context)).toEqual(currentUser);
    }
  });

  it("registers the shared review schemas in parameter and body validation pipes", () => {
    const paramsMetadata = {
      type: "param",
      metatype: Object,
      data: undefined,
    } as const;
    const bodyMetadata = {
      type: "body",
      metatype: Object,
      data: undefined,
    } as const;

    expect(validationPipe("findMine", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("findMine", 1).transform(
        { reviewId: REVIEW_ID },
        paramsMetadata,
      ),
    ).toEqual(ReviewIdParamsSchema.parse({ reviewId: REVIEW_ID }));
    expect(validationPipe("create", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("create", 1).transform(
        { ...createInput, content: "  다시 방문하고 싶은 곳이에요.  " },
        bodyMetadata,
      ),
    ).toEqual(CreateReviewRequestSchema.parse(createInput));
    expect(validationPipe("update", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("update", 1).transform(
        { reviewId: REVIEW_ID },
        paramsMetadata,
      ),
    ).toEqual(ReviewIdParamsSchema.parse({ reviewId: REVIEW_ID }));
    expect(validationPipe("update", 2)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("update", 2).transform(
        { ...updateInput, content: "  수정한 후기 본문입니다.  " },
        bodyMetadata,
      ),
    ).toEqual(UpdateReviewRequestSchema.parse(updateInput));
  });

  it("parses every service result through the public response schemas", async () => {
    const invalidReview = { ...review, updatedAt: "not-an-iso-date" };
    const reviews = {
      listMine: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        items: [invalidReview],
      }),
      findMine: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(invalidReview),
      create: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(invalidReview),
      update: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(invalidReview),
    };
    const controller = new ReviewsController(reviews as never);
    const params: ReviewIdParams = { reviewId: REVIEW_ID };

    await expect(controller.listMine(currentUser)).rejects.toThrow();
    await expect(controller.findMine(currentUser, params)).rejects.toThrow();
    await expect(controller.create(currentUser, createInput)).rejects.toThrow();
    await expect(
      controller.update(currentUser, params, updateInput),
    ).rejects.toThrow();
  });

  it("removes fields that are not part of the public review contracts", async () => {
    const reviews = {
      listMine: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        items: [{ ...review, internalOnly: "do-not-leak" }],
      }),
      findMine: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ ...review, internalOnly: "do-not-leak" }),
      create: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ ...review, internalOnly: "do-not-leak" }),
      update: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ ...review, internalOnly: "do-not-leak" }),
    };
    const controller = new ReviewsController(reviews as never);
    const params: ReviewIdParams = { reviewId: REVIEW_ID };

    await expect(controller.listMine(currentUser)).resolves.toEqual(
      MyReviewsResponseSchema.parse({ items: [review] }),
    );
    await expect(controller.findMine(currentUser, params)).resolves.toEqual(
      ReviewItemSchema.parse(review),
    );
    await expect(controller.create(currentUser, createInput)).resolves.toEqual(
      ReviewItemSchema.parse(review),
    );
    await expect(
      controller.update(currentUser, params, updateInput),
    ).resolves.toEqual(ReviewItemSchema.parse(review));
  });
});
