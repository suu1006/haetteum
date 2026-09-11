import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import { PlaceReelsService } from "./place-reels.service.js";

type ReelRow = {
  providerVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: bigint | null;
  publishedAt: Date;
};

const reelRow: ReelRow = {
  providerVideoId: "dQw4w9WgXcQ",
  title: "성산일출봉 일출 브이로그",
  channelTitle: "여행하는 haetteum",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/oardefault.jpg",
  durationSeconds: 42,
  viewCount: 128000n,
  publishedAt: new Date("2026-08-20T21:00:00.000Z"),
};

describe("PlaceReelsService", () => {
  describe("listForPlace", () => {
    it("throws when the place does not exist", async () => {
      const service = new PlaceReelsService({
        place: {
          findUnique: jest.fn<() => Promise<null>>().mockResolvedValue(null),
        },
      } as never);

      await expect(
        service.listForPlace("11111111-1111-4111-8111-111111111111"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("maps cached reels with an embed URL and numeric view count", async () => {
      const service = new PlaceReelsService({
        place: {
          findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            id: "22222222-2222-4222-8222-222222222222",
            reelsSyncedAt: new Date("2026-08-28T00:00:00.000Z"),
          }),
        },
        placeReel: {
          findMany: jest
            .fn<() => Promise<ReelRow[]>>()
            .mockResolvedValue([reelRow, { ...reelRow, viewCount: null }]),
        },
      } as never);

      const result = await service.listForPlace(
        "22222222-2222-4222-8222-222222222222",
      );

      expect(result).toEqual({
        placeId: "22222222-2222-4222-8222-222222222222",
        source: "YOUTUBE",
        fetchedAt: "2026-08-28T00:00:00.000Z",
        items: [
          {
            provider: "YOUTUBE",
            videoId: "dQw4w9WgXcQ",
            title: "성산일출봉 일출 브이로그",
            channelTitle: "여행하는 haetteum",
            thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/oardefault.jpg",
            durationSeconds: 42,
            viewCount: 128000,
            publishedAt: "2026-08-20T21:00:00.000Z",
            embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
          },
          expect.objectContaining({ viewCount: null }),
        ],
      });
    });
  });

  describe("listPopular", () => {
    it("returns an empty list when no ranking snapshot exists", async () => {
      const service = new PlaceReelsService({
        place: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        },
        placeRanking: {
          findFirst: jest.fn<() => Promise<null>>().mockResolvedValue(null),
        },
      } as never);

      await expect(
        service.listPopular({ audience: "all", region: "all", limit: 12 }),
      ).resolves.toEqual({
        source: "YOUTUBE",
        audience: "all",
        region: "all",
        items: [],
        nextCursor: null,
      });
    });

    it("flattens every place's reels in rank then display order", async () => {
      const service = new PlaceReelsService({
        place: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        },
        placeRanking: {
          findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            periodStart: new Date("2025-08-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-31T00:00:00.000Z"),
          }),
          findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue([
            {
              placeId: "33333333-3333-4333-8333-333333333333",
              place: {
                id: "33333333-3333-4333-8333-333333333333",
                title: "성산일출봉",
                region: { name: "제주특별자치도" },
                reels: [
                  reelRow,
                  { ...reelRow, providerVideoId: "aaaaaaaaaaa" },
                ],
              },
            },
            {
              placeId: "44444444-4444-4444-8444-444444444444",
              place: {
                id: "44444444-4444-4444-8444-444444444444",
                title: "협재해수욕장",
                region: { name: "제주특별자치도" },
                reels: [{ ...reelRow, providerVideoId: "zzzzzzzzzzz" }],
              },
            },
          ]),
        },
      } as never);

      const result = await service.listPopular({
        audience: "all",
        region: "all",
        limit: 2,
      });

      expect(result.items.map((item) => item.videoId)).toEqual([
        "dQw4w9WgXcQ",
        "aaaaaaaaaaa",
      ]);
      expect(result.items.map((item) => item.placeId)).toEqual([
        "33333333-3333-4333-8333-333333333333",
        "33333333-3333-4333-8333-333333333333",
      ]);
      expect(result.items[0]).toMatchObject({
        placeId: "33333333-3333-4333-8333-333333333333",
        placeTitle: "성산일출봉",
        region: "제주특별자치도",
      });
      expect(result.nextCursor).toBe(2);
    });

    it("continues from the cursor and reports no next page once exhausted", async () => {
      const service = new PlaceReelsService({
        place: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        },
        placeRanking: {
          findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            periodStart: new Date("2025-08-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-31T00:00:00.000Z"),
          }),
          findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue([
            {
              placeId: "33333333-3333-4333-8333-333333333333",
              place: {
                id: "33333333-3333-4333-8333-333333333333",
                title: "성산일출봉",
                region: { name: "제주특별자치도" },
                reels: [
                  reelRow,
                  { ...reelRow, providerVideoId: "aaaaaaaaaaa" },
                ],
              },
            },
            {
              placeId: "44444444-4444-4444-8444-444444444444",
              place: {
                id: "44444444-4444-4444-8444-444444444444",
                title: "협재해수욕장",
                region: { name: "제주특별자치도" },
                reels: [{ ...reelRow, providerVideoId: "zzzzzzzzzzz" }],
              },
            },
          ]),
        },
      } as never);

      const result = await service.listPopular({
        audience: "all",
        region: "all",
        limit: 2,
        cursor: 2,
      });

      expect(result.items.map((item) => item.videoId)).toEqual(["zzzzzzzzzzz"]);
      expect(result.nextCursor).toBeNull();
    });

    it("skips a ranked place that has no reels instead of leaving a gap", async () => {
      const service = new PlaceReelsService({
        place: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        },
        placeRanking: {
          findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            periodStart: new Date("2025-08-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-31T00:00:00.000Z"),
          }),
          findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue([
            {
              placeId: "33333333-3333-4333-8333-333333333333",
              place: {
                id: "33333333-3333-4333-8333-333333333333",
                title: "성산일출봉",
                region: { name: "제주특별자치도" },
                reels: [],
              },
            },
            {
              placeId: "44444444-4444-4444-8444-444444444444",
              place: {
                id: "44444444-4444-4444-8444-444444444444",
                title: "협재해수욕장",
                region: { name: "제주특별자치도" },
                reels: [{ ...reelRow, providerVideoId: "zzzzzzzzzzz" }],
              },
            },
          ]),
        },
      } as never);

      const result = await service.listPopular({
        audience: "all",
        region: "all",
        limit: 2,
      });

      expect(result.items.map((item) => item.videoId)).toEqual(["zzzzzzzzzzz"]);
    });

    it("scopes the ranking query to the requested region and echoes it back", async () => {
      const findMany = jest.fn<() => Promise<unknown>>().mockResolvedValue([]);
      const service = new PlaceReelsService({
        place: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        },
        placeRanking: {
          findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            periodStart: new Date("2025-08-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-31T00:00:00.000Z"),
          }),
          findMany,
        },
      } as never);

      const result = await service.listPopular({
        audience: "all",
        region: "jeju",
        limit: 12,
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            place: { is: { region: { is: { slug: "jeju" } } } },
          }) as unknown,
        }),
      );
      expect(result.region).toBe("jeju");
    });
  });
});

it("serves and paginates Jeju reels without a national ranking snapshot", async () => {
  const findMany = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
    {
      id: "jeju-place",
      title: "성산일출봉",
      region: { name: "제주특별자치도" },
      reels: [reelRow, { ...reelRow, providerVideoId: "other-video" }],
    },
  ]);
  const service = new PlaceReelsService({
    place: { findMany },
    placeRanking: {
      findFirst: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    },
  } as never);
  const first = await service.listPopular({
    audience: "all",
    region: "jeju",
    limit: 1,
  });
  expect(first.items[0]).toMatchObject({
    placeTitle: "성산일출봉",
    region: "제주특별자치도",
  });
  expect(first.nextCursor).toBe(1);
  const second = await service.listPopular({
    audience: "all",
    region: "jeju",
    limit: 1,
    cursor: 1,
  });
  expect(second.items[0].videoId).toBe("other-video");
  expect(second.nextCursor).toBeNull();
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        region: { is: { slug: "jeju" } },
      }) as unknown,
    }),
  );
});
