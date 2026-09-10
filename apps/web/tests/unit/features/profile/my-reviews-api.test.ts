import type {
  CreateReviewRequest,
  PlaceListItem,
  ReviewItem,
  UpdateReviewRequest,
} from "@haetteum/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  createReview,
  deleteReview,
  loadReview,
  loadMyReviews,
  mapReviewItem,
  searchReviewPlaces,
  updateReview,
} from "@/features/profile/my-reviews-api";

const review = {
  id: "24684077-a907-45c3-85bf-b509dab12377",
  placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
  placeTitle: "에버랜드",
  location: "경기 용인",
  rating: 5,
  title: "하루 종일 즐거웠어요",
  content: "퍼레이드와 놀이기구를 하루 종일 즐겼어요.",
  images: [],
  primaryImageUrl: null,
  createdAt: "2026-08-25T14:00:00.000Z",
  updatedAt: "2026-08-26T01:30:00.000Z",
} as const satisfies ReviewItem;

const createInput = {
  placeId: review.placeId,
  rating: 5,
  title: "다시 오고 싶어요",
  content: "다시 방문하고 싶은 곳이에요.",
  images: [],
} as const satisfies CreateReviewRequest;

const updateInput = {
  rating: 4,
  title: "여유로웠던 재방문",
  content: "평일에 다시 방문해 보니 더 여유로웠어요.",
  images: [],
} as const satisfies UpdateReviewRequest;

const place = {
  id: review.placeId,
  title: "성산일출봉",
  region: "jeju",
  district: "서귀포시",
  address: "제주특별자치도 서귀포시 성산읍",
  longitude: 126.9406,
  latitude: 33.4581,
  primaryImageUrl: null,
  imageCopyrightType: null,
} as const satisfies PlaceListItem;

const mutationErrorMessage =
  "후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

describe("review thumbnail source", () => {
  it("normalizes HTTP tourism images before requesting Next image optimization", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ ...review,
        primaryImageUrl: "http://tong.visitkorea.or.kr/cms/resource/photo.jpg",
      }] }), { status: 200 }),
    );
    const result = await loadMyReviews(null, fetchImpl, "http://api.test/api/v1");
    expect(result).toMatchObject({ status: "ready", items: [{ image: { src: "https://tong.visitkorea.or.kr/cms/resource/photo.jpg" } }] });
  });
});

describe("loadMyReviews", () => {
  it("fetches the written reviews without caching, validates the contract, and maps the fallback image", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [review] }), { status: 200 }),
    );

    await expect(
      loadMyReviews(null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({
      status: "ready",
      items: [
        expect.objectContaining({
          id: review.id,
          placeId: review.placeId,
          title: "에버랜드",
          location: "경기 용인",
          rating: 5,
          date: "2026.08.26",
          content: review.content,
          likeCount: 0,
          commentCount: 0,
          image: {
            src: "/images/explore/categories/popular-attraction.png",
            alt: "에버랜드 대표 이미지",
          },
        }),
      ],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/reviews/mine",
      { cache: "no-store", headers: {} },
    );
  });

  it("preserves a primary image URL from the review response", () => {
    expect(
      mapReviewItem({
        ...review,
        primaryImageUrl: "https://tong.visitkorea.or.kr/everland.jpg",
      }),
    ).toMatchObject({
      image: {
        src: "https://tong.visitkorea.or.kr/everland.jpg",
        alt: "에버랜드 대표 이미지",
      },
    });
  });

  it("returns an error state for malformed JSON", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("not-json", { status: 200 }),
    );

    await expect(
      loadMyReviews(null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("returns an error state for a schema-incompatible review response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [{}] }), { status: 200 }),
    );

    await expect(
      loadMyReviews(null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("returns an error state for a non-success response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("upstream failure", { status: 503 }),
    );

    await expect(
      loadMyReviews(null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("returns an error state for a thrown fetch", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("socket closed"));

    await expect(
      loadMyReviews(null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("forwards the visitor's session cookie to the API", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );

    await loadMyReviews(
      "session=abc123",
      fetchImpl,
      "http://api.test/api/v1",
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/reviews/mine",
      { cache: "no-store", headers: { Cookie: "session=abc123" } },
    );
  });

  it("returns an error state without calling fetch for a blank API base URL", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(loadMyReviews(null, fetchImpl, "   ")).resolves.toEqual({
      status: "error",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("review detail and mutation adapters", () => {
  it("loads one review without caching and validates the shared response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(review), { status: 200 }),
    );

    await expect(
      loadReview(review.id, null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "ready", review });

    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api.test/api/v1/reviews/${review.id}`,
      { cache: "no-store", headers: {} },
    );
  });

  it("returns not-found for a missing review", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("missing", { status: 404 }),
    );

    await expect(
      loadReview(review.id, null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "not-found" });
  });

  it("returns an error for malformed successful review JSON", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: review.id }), { status: 200 }),
    );

    await expect(
      loadReview(review.id, null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("does not request a detail or update for a malformed review ID", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      loadReview("not-a-review-id", null, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
    await expect(
      updateReview(
        "not-a-review-id",
        updateInput,
        fetchImpl,
        "http://api.test/api/v1",
      ),
    ).resolves.toEqual({ status: "error", message: mutationErrorMessage });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts an exact review request and validates the created review", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(review), { status: 201 }),
    );

    await expect(
      createReview(createInput, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "success", review });

    expect(fetchImpl).toHaveBeenCalledWith("http://api.test/api/v1/reviews", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createInput),
    });
  });

  it("patches an exact review request and validates the updated review", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ...review, ...updateInput }), {
        status: 200,
      }),
    );

    await expect(
      updateReview(
        review.id,
        updateInput,
        fetchImpl,
        "http://api.test/api/v1/",
      ),
    ).resolves.toEqual({
      status: "success",
      review: { ...review, ...updateInput },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api.test/api/v1/reviews/${review.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateInput),
      },
    );
  });

  it.each([
    {
      label: "POST",
      status: 201,
      request: (fetchImpl: typeof fetch) =>
        createReview(createInput, fetchImpl, "http://api.test/api/v1"),
    },
    {
      label: "PATCH",
      status: 200,
      request: (fetchImpl: typeof fetch) =>
        updateReview(
          review.id,
          updateInput,
          fetchImpl,
          "http://api.test/api/v1",
        ),
    },
  ])("returns a fixed safe error for a non-JSON successful $label response", async ({
    status,
    request,
  }) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("not-json", { status }),
    );

    await expect(request(fetchImpl)).resolves.toEqual({
      status: "error",
      message: mutationErrorMessage,
    });
  });

  it.each([
    {
      label: "POST",
      status: 201,
      request: (fetchImpl: typeof fetch) =>
        createReview(createInput, fetchImpl, "http://api.test/api/v1"),
    },
    {
      label: "PATCH",
      status: 200,
      request: (fetchImpl: typeof fetch) =>
        updateReview(
          review.id,
          updateInput,
          fetchImpl,
          "http://api.test/api/v1",
        ),
    },
  ])(
    "returns a fixed safe error for a schema-incompatible JSON $label response",
    async ({ status, request }) => {
      const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ id: review.id }), { status }),
      );

      await expect(request(fetchImpl)).resolves.toEqual({
        status: "error",
        message: mutationErrorMessage,
      });
    },
  );

  it("returns a typed duplicate only for a valid duplicate Problem Details response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Conflict",
          status: 409,
          detail: "이미 해당 장소에 후기를 작성했습니다.",
          instance: "/api/v1/reviews",
          code: "REVIEW_ALREADY_EXISTS",
          requestId: "24684077-a907-45c3-85bf-b509dab12377",
        }),
        { status: 409 },
      ),
    );

    await expect(
      createReview(createInput, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "duplicate" });
  });

  it("keeps a status-consistent 409 with an unapproved code generic", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Conflict",
          status: 409,
          detail: "a raw server error that must not be exposed",
          instance: "/api/v1/reviews",
          code: "PLACE_NOT_FOUND",
          requestId: "24684077-a907-45c3-85bf-b509dab12377",
        }),
        { status: 409 },
      ),
    );

    await expect(
      createReview(createInput, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error", message: mutationErrorMessage });
  });

  it("keeps validation errors generic instead of exposing raw server detail", async () => {
    const rawServerDetail = "database endpoint postgres://internal.example.test";
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: rawServerDetail,
          instance: "/api/v1/reviews",
          code: "VALIDATION_ERROR",
          requestId: "24684077-a907-45c3-85bf-b509dab12377",
        }),
        { status: 400 },
      ),
    );

    await expect(
      updateReview(
        review.id,
        updateInput,
        fetchImpl,
        "http://api.test/api/v1",
      ),
    ).resolves.toEqual({ status: "error", message: mutationErrorMessage });
  });

  it("returns an error for a malformed duplicate Problem Details response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: "REVIEW_ALREADY_EXISTS" }), {
        status: 409,
      }),
    );

    await expect(
      createReview(createInput, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error", message: mutationErrorMessage });
  });

  it("does not classify an inconsistent duplicate Problem Details response as a duplicate", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Conflict",
          status: 400,
          detail: "unexpected response status",
          instance: "/api/v1/reviews",
          code: "REVIEW_ALREADY_EXISTS",
          requestId: "24684077-a907-45c3-85bf-b509dab12377",
        }),
        { status: 409 },
      ),
    );

    await expect(
      createReview(createInput, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error", message: mutationErrorMessage });
  });
});

describe("deleteReview", () => {
  const deleteErrorMessage =
    "후기를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.";

  it("sends an exact delete request for a valid review id", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await expect(
      deleteReview(review.id, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "success" });

    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api.test/api/v1/reviews/${review.id}`,
      { method: "DELETE", credentials: "include" },
    );
  });

  it("does not request a delete for a malformed review id", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      deleteReview("not-a-review-id", fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error", message: deleteErrorMessage });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns an error for a non-success response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("upstream failure", { status: 500 }),
    );

    await expect(
      deleteReview(review.id, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error", message: deleteErrorMessage });
  });

  it("returns an error when the fetch rejects", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("socket closed"));

    await expect(
      deleteReview(review.id, fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error", message: deleteErrorMessage });
  });

  it("does not call fetch when the API base URL is blank", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(deleteReview(review.id, fetchImpl, "   ")).resolves.toEqual({
      status: "error",
      message: deleteErrorMessage,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("searchReviewPlaces", () => {
  it("fetches a decoded regional search URL without caching and validates the page", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [place],
          page: 1,
          pageSize: 20,
          totalCount: 1,
        }),
        { status: 200 },
      ),
    );

    await expect(
      searchReviewPlaces(
        "jeju",
        "성산",
        fetchImpl,
        "http://api.test/api/v1/",
      ),
    ).resolves.toEqual({ status: "ready", items: [place] });

    const [requestUrl, options] = fetchImpl.mock.calls[0]!;
    const url = new URL(requestUrl.toString());
    expect(url.pathname).toBe("/api/v1/places");
    expect(url.searchParams.get("region")).toBe("jeju");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("pageSize")).toBe("20");
    expect(url.searchParams.get("q")).toBe("성산");
    expect(options).toEqual({ cache: "no-store", credentials: "include" });
  });

  it("returns an error for malformed successful place JSON", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [{}] }), { status: 200 }),
    );

    await expect(
      searchReviewPlaces("jeju", "성산", fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("does not call fetch when the API base URL is blank", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      loadReview(review.id, null, fetchImpl, "   "),
    ).resolves.toEqual({
      status: "error",
    });
    await expect(createReview(createInput, fetchImpl, "   ")).resolves.toEqual({
      status: "error",
      message: mutationErrorMessage,
    });
    await expect(
      updateReview(review.id, updateInput, fetchImpl, "   "),
    ).resolves.toEqual({ status: "error", message: mutationErrorMessage });
    await expect(
      searchReviewPlaces("jeju", "성산", fetchImpl, "   "),
    ).resolves.toEqual({ status: "error" });

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("adapter transport errors", () => {
  it.each([
    {
      label: "review detail",
      expected: { status: "error" },
      request: (fetchImpl: typeof fetch) =>
        loadReview(review.id, null, fetchImpl, "http://api.test/api/v1"),
    },
    {
      label: "review creation",
      expected: { status: "error", message: mutationErrorMessage },
      request: (fetchImpl: typeof fetch) =>
        createReview(createInput, fetchImpl, "http://api.test/api/v1"),
    },
    {
      label: "review update",
      expected: { status: "error", message: mutationErrorMessage },
      request: (fetchImpl: typeof fetch) =>
        updateReview(
          review.id,
          updateInput,
          fetchImpl,
          "http://api.test/api/v1",
        ),
    },
    {
      label: "place search",
      expected: { status: "error" },
      request: (fetchImpl: typeof fetch) =>
        searchReviewPlaces(
          "jeju",
          "성산",
          fetchImpl,
          "http://api.test/api/v1",
        ),
    },
  ])("returns a safe result when $label fetch rejects", async ({
    expected,
    request,
  }) => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("raw socket failure"));

    await expect(request(fetchImpl)).resolves.toEqual(expected);
  });
});
