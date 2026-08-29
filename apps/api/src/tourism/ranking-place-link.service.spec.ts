/* eslint-disable @typescript-eslint/require-await -- fake Prisma and TourAPI methods preserve the async interfaces */
import { jest } from "@jest/globals";

import { RankingPlaceLinkService } from "./ranking-place-link.service.js";

type FakePlace = { id: string; source: string; externalId: string };

class FakePrisma {
  regions: Array<{ id: string; providerCode: string; isActive: boolean }> = [
    { id: "region-seoul", providerCode: "11", isActive: true },
  ];
  districts: Array<{ id: string; regionId: string; providerCode: string }> = [
    { id: "district-gangnam", regionId: "region-seoul", providerCode: "11680" },
  ];
  places: FakePlace[] = [];
  created: Array<Record<string, unknown>> = [];

  tourismRegion = {
    findFirst: jest.fn(
      async (args: { where: { providerCode: string; isActive: true } }) => {
        const region = this.regions.find(
          (candidate) =>
            candidate.providerCode === args.where.providerCode &&
            candidate.isActive,
        );
        return region ? { id: region.id } : null;
      },
    ),
  };

  tourismDistrict = {
    findFirst: jest.fn(
      async (args: { where: { regionId: string; providerCode: string } }) => {
        const district = this.districts.find(
          (candidate) =>
            candidate.regionId === args.where.regionId &&
            candidate.providerCode === args.where.providerCode,
        );
        return district ? { id: district.id } : null;
      },
    ),
  };

  place = {
    findFirst: jest.fn(
      async (args: { where: { source: string; externalId: string } }) => {
        const place = this.places.find(
          (candidate) =>
            candidate.source === args.where.source &&
            candidate.externalId === args.where.externalId,
        );
        return place ? { id: place.id } : null;
      },
    ),
    create: jest.fn(async (args: { data: Record<string, unknown> }) => {
      this.created.push(args.data);
      return { id: `place-${String(args.data.externalId)}` };
    }),
  };
}

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    contentid: "264570",
    contenttypeid: "14",
    title: "코엑스",
    addr1: "서울특별시 강남구 영동대로 513",
    mapx: "127.0587",
    mapy: "37.5124",
    firstimage: "http://tong.visitkorea.or.kr/coex.jpg",
    cpyrhtDivCd: "Type3",
    modifiedtime: "20260101120000",
    lDongRegnCd: "11",
    lDongSignguCd: "11680",
    ...overrides,
  };
}

describe("RankingPlaceLinkService", () => {
  it("creates a place from the keyword match even outside the synced content type", async () => {
    const prisma = new FakePrisma();
    const searchPlaceCandidates = jest.fn(async () => [candidate()]);

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates,
    } as never);

    await expect(
      service.resolvePlaceId({ placeName: "코엑스", areaCode: "1" }),
    ).resolves.toBe("place-264570");
    expect(searchPlaceCandidates).toHaveBeenCalledWith({
      keyword: "코엑스",
      areaCode: "1",
    });
    expect(prisma.created).toHaveLength(1);
    expect(prisma.created[0]).toMatchObject({
      source: "TOUR_API",
      externalId: "264570",
      contentTypeId: 14,
      title: "코엑스",
      regionId: "region-seoul",
      districtId: "district-gangnam",
      isVisible: true,
    });
  });

  it("sweeps the served regions when the ranking row carries no province", async () => {
    const prisma = new FakePrisma();
    const searchPlaceCandidates = jest.fn(
      async (input: { keyword: string; areaCode?: string }) =>
        input.areaCode === "32"
          ? [candidate({ contentid: "1", lDongRegnCd: "11" })]
          : [],
    );

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates,
    } as never);

    await expect(service.resolvePlaceId({ placeName: "코엑스" })).resolves.toBe(
      "place-1",
    );
    expect(searchPlaceCandidates.mock.calls.map(([input]) => input)).toEqual([
      { keyword: "코엑스", areaCode: "1" },
      { keyword: "코엑스", areaCode: "31" },
      { keyword: "코엑스", areaCode: "32" },
    ]);
  });

  it("stops sweeping as soon as a region returns the exact name", async () => {
    const prisma = new FakePrisma();
    const searchPlaceCandidates = jest.fn(async () => [candidate()]);

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates,
    } as never);

    await expect(service.resolvePlaceId({ placeName: "코엑스" })).resolves.toBe(
      "place-264570",
    );
    expect(searchPlaceCandidates).toHaveBeenCalledTimes(1);
  });

  it("links a match that has no photo yet", async () => {
    const prisma = new FakePrisma();

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates: jest.fn(async () => [
        candidate({
          contentid: "127635",
          title: "예술의전당",
          firstimage: undefined,
          firstimage2: undefined,
        }),
      ]),
    } as never);

    await expect(
      service.resolvePlaceId({ placeName: "예술의전당", areaCode: "1" }),
    ).resolves.toBe("place-127635");
    expect(prisma.created[0]).toMatchObject({
      title: "예술의전당",
      primaryImageUrl: null,
    });
  });

  it("reuses an already stored place instead of creating a duplicate", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      { id: "place-existing", source: "TOUR_API", externalId: "264570" },
    ];

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates: jest.fn(async () => [candidate()]),
    } as never);

    await expect(service.resolvePlaceId({ placeName: "코엑스" })).resolves.toBe(
      "place-existing",
    );
    expect(prisma.created).toHaveLength(0);
  });

  it("leaves the row unlinked when the match sits outside the served regions", async () => {
    const prisma = new FakePrisma();

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates: jest.fn(async () => [
        candidate({ lDongRegnCd: "48", lDongSignguCd: "48170" }),
      ]),
    } as never);

    await expect(
      service.resolvePlaceId({ placeName: "코엑스" }),
    ).resolves.toBeNull();
    expect(prisma.created).toHaveLength(0);
  });

  it("returns null when no candidate is related to the keyword", async () => {
    const prisma = new FakePrisma();

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates: jest.fn(async () => [
        candidate({ title: "전혀 다른 장소" }),
      ]),
    } as never);

    await expect(
      service.resolvePlaceId({ placeName: "코엑스" }),
    ).resolves.toBeNull();
    expect(prisma.created).toHaveLength(0);
  });

  it("refuses a candidate that merely extends the ranking name", async () => {
    const prisma = new FakePrisma();

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates: jest.fn(async () => [
        candidate({ title: "킨텍스 바이 케이트리", contenttypeid: "32" }),
      ]),
    } as never);

    await expect(
      service.resolvePlaceId({
        placeName: "킨텍스제2전시장",
        areaCode: "31",
      }),
    ).resolves.toBeNull();
    expect(prisma.created).toHaveLength(0);
  });

  it("returns null without touching the database when TourAPI is not configured", async () => {
    const prisma = new FakePrisma();

    const service = new RankingPlaceLinkService(prisma);

    await expect(
      service.resolvePlaceId({ placeName: "코엑스" }),
    ).resolves.toBeNull();
    expect(prisma.place.findFirst).not.toHaveBeenCalled();
  });

  it("swallows a TourAPI failure so the backfill can continue", async () => {
    const prisma = new FakePrisma();

    const service = new RankingPlaceLinkService(prisma, {
      searchPlaceCandidates: jest.fn(async () => {
        throw new Error("provider down");
      }),
    } as never);

    await expect(
      service.resolvePlaceId({ placeName: "코엑스" }),
    ).resolves.toBeNull();
  });
});
