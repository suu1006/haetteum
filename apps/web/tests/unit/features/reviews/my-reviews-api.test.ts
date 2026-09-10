import type { ReviewItem } from "@haetteum/contracts";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadMyReviews } from "@/features/reviews/my-reviews-api";

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

describe("review thumbnail source", () => {
  it("normalizes HTTP tourism images before requesting Next image optimization", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ ...review,
        primaryImageUrl: "http://tong.visitkorea.or.kr/cms/resource/photo.jpg",
      }] }), { status: 200 }),
    );
    const result = await loadMyReviews(null, fetchImpl, "http://api.test/api/v1");
    expect(result).toMatchObject({ status: "ready", data: { written: [{ image: { src: "https://tong.visitkorea.or.kr/cms/resource/photo.jpg" } }] } });
  });
});

describe("loadMyReviews", () => {
  it("forwards the incoming cookie without caching and maps actual reviews", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [review] }), { status: 200 }),
    );

    await expect(
      loadMyReviews(
        "haetteum_session=opaque-session",
        fetchImpl,
        "http://api.test/api/v1/",
      ),
    ).resolves.toEqual({
      status: "ready",
      data: {
        written: [
          {
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
          },
        ],
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/reviews/mine",
      {
        cache: "no-store",
        headers: { Cookie: "haetteum_session=opaque-session" },
      },
    );
  });

  it("preserves a provider image and still uses truthful interaction defaults", async () => {
    const remoteReview = {
      ...review,
      primaryImageUrl: "https://tong.visitkorea.or.kr/everland.jpg",
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [remoteReview] }), { status: 200 }),
    );

    const result = await loadMyReviews(
      null,
      fetchImpl,
      "http://api.test/api/v1",
    );

    expect(result).toMatchObject({
      status: "ready",
      data: {
        written: [
          {
            likeCount: 0,
            commentCount: 0,
            image: { src: remoteReview.primaryImageUrl },
          },
        ],
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/reviews/mine",
      { cache: "no-store", headers: {} },
    );
  });

  it("returns an error for a schema-incompatible successful response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: review.id }] }), {
        status: 200,
      }),
    );

    await expect(
      loadMyReviews("session=x", fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("returns an error for non-success, invalid JSON, fetch failure, or missing configuration", async () => {
    const nonSuccess = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("unavailable", { status: 503 }),
    );
    const invalidJson = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("not-json", { status: 200 }),
    );
    const thrown = vi.fn<typeof fetch>().mockRejectedValue(new Error("closed"));
    const unused = vi.fn<typeof fetch>();

    await expect(
      loadMyReviews("session=x", nonSuccess, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
    await expect(
      loadMyReviews("session=x", invalidJson, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
    await expect(
      loadMyReviews("session=x", thrown, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
    await expect(loadMyReviews("session=x", unused, "  ")).resolves.toEqual({
      status: "error",
    });
    expect(unused).not.toHaveBeenCalled();
  });
});
