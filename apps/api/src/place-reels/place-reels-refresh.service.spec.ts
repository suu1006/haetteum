import { jest } from "@jest/globals";

import { PlaceReelsRefreshService } from "./place-reels-refresh.service.js";
import type { YouTubeShort } from "./youtube-api.types.js";

function short(videoId: string): YouTubeShort {
  return {
    videoId,
    title: "제목",
    channelTitle: "채널",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hq.jpg`,
    durationSeconds: 40,
    viewCount: 100,
    publishedAt: new Date("2026-08-20T00:00:00.000Z"),
  };
}

type TxRecorder = {
  deleteMany: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
};

function createPrisma(rankedRows: unknown[]) {
  const tx: TxRecorder = {
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
    createMany: jest.fn(() => Promise.resolve({ count: 0 })),
    update: jest.fn(() => Promise.resolve({})),
  };
  const prisma = {
    place: {
      findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    },
    placeRanking: {
      findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(
        rankedRows.length > 0
          ? {
              periodStart: new Date("2025-08-01T00:00:00.000Z"),
              periodEnd: new Date("2026-07-31T00:00:00.000Z"),
            }
          : null,
      ),
      findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue(rankedRows),
    },
    $transaction: jest.fn((callback: (client: unknown) => unknown) =>
      Promise.resolve(
        callback({
          placeReel: {
            deleteMany: tx.deleteMany,
            createMany: tx.createMany,
          },
          place: { update: tx.update },
        }),
      ),
    ),
  };
  return { prisma, tx };
}

function rankedRow(id: string, title: string) {
  return {
    place: { id, title, region: { name: "제주특별자치도" } },
  };
}

function createService(
  prisma: unknown,
  options: {
    enabled?: boolean;
    search?: jest.Mock<() => Promise<readonly YouTubeShort[]>>;
  } = {},
) {
  const config = {
    get: jest.fn(() => options.enabled ?? true),
  };
  const search =
    options.search ?? jest.fn(() => Promise.resolve([short("a"), short("b")]));
  const youtube = { searchPlaceShorts: search };
  const sleep = jest.fn(() => Promise.resolve());
  return {
    service: new PlaceReelsRefreshService(
      prisma as never,
      config as never,
      youtube,
      sleep,
    ),
    search,
    sleep,
  };
}

describe("PlaceReelsRefreshService", () => {
  it("does nothing when the feature flag is disabled", async () => {
    const { prisma } = createPrisma([rankedRow("p1", "성산일출봉")]);
    const { service, search } = createService(prisma, { enabled: false });

    const summary = await service.refreshRankedPlaces();

    expect(summary).toEqual({
      enabled: false,
      audience: "all",
      processedPlaces: 0,
      insertedReels: 0,
      emptyPlaces: 0,
      failedPlaces: 0,
    });
    expect(search).not.toHaveBeenCalled();
  });

  it("returns a zero summary when there is no ranking snapshot", async () => {
    const { prisma } = createPrisma([]);
    const { service } = createService(prisma);

    const summary = await service.refreshRankedPlaces();

    expect(summary.processedPlaces).toBe(0);
  });

  it("replaces cached reels per ranked place and records the sync time", async () => {
    const { prisma, tx } = createPrisma([
      rankedRow("p1", "성산일출봉"),
      rankedRow("p2", "협재해수욕장"),
    ]);
    const { service, search, sleep } = createService(prisma);

    const summary = await service.refreshRankedPlaces({ limit: 2 });

    expect(summary).toMatchObject({
      enabled: true,
      processedPlaces: 2,
      insertedReels: 4,
      emptyPlaces: 0,
      failedPlaces: 0,
    });
    expect(search).toHaveBeenCalledWith({
      query: "성산일출봉 제주특별자치도 여행",
      maxResults: 10,
    });
    expect(tx.deleteMany).toHaveBeenCalledTimes(2);
    expect(tx.createMany).toHaveBeenCalledTimes(2);
    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("counts a place with no results as empty and keeps going after a failure", async () => {
    const { prisma } = createPrisma([
      rankedRow("p1", "실패장소"),
      rankedRow("p2", "빈장소"),
    ]);
    const search = jest.fn(() => Promise.resolve([])) as jest.Mock<
      () => Promise<readonly YouTubeShort[]>
    >;
    search.mockRejectedValueOnce(new Error("boom"));
    const { service } = createService(prisma, { search });

    const summary = await service.refreshRankedPlaces();

    expect(summary).toMatchObject({
      processedPlaces: 1,
      insertedReels: 0,
      emptyPlaces: 1,
      failedPlaces: 1,
    });
  });
});

it("collects regional attractions even without a national ranking snapshot", async () => {
  const { prisma } = createPrisma([]);
  prisma.place.findMany.mockResolvedValue([
    {
      id: "jeju-place",
      title: "성산일출봉",
      region: { name: "제주특별자치도" },
    },
  ]);
  const { service, search } = createService(prisma);
  const result = await service.refreshRankedPlaces({
    region: "jeju",
    limit: 3,
  });
  expect(result.processedPlaces).toBe(1);
  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({ query: "성산일출봉 제주특별자치도 여행" }),
  );
});
