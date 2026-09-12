/* eslint-disable @typescript-eslint/require-await -- fake Prisma methods preserve the async database interface */
import { jest } from "@jest/globals";

import { RankingPlaceLinkService } from "./ranking-place-link.service.js";

type FakePlace = {
  id: string;
  source: string;
  title: string;
  isVisible: boolean;
  region: { providerCode: string; isActive: boolean };
};

class FakePrisma {
  places: FakePlace[] = [];

  place = {
    findMany: jest.fn(
      async (args: {
        where: {
          source: string;
          isVisible: true;
          region?: { providerCode: string; isActive: true };
        };
      }) =>
        this.places
          .filter(
            (candidate) =>
              candidate.source === args.where.source &&
              candidate.isVisible &&
              (args.where.region === undefined ||
                (candidate.region.providerCode ===
                  args.where.region.providerCode &&
                  candidate.region.isActive)),
          )
          .map(({ id, title }) => ({ id, title })),
    ),
  };
}

function place(id: string, title: string, providerCode = "11"): FakePlace {
  return {
    id,
    source: "TOUR_API",
    title,
    isVisible: true,
    region: { providerCode, isActive: true },
  };
}

describe("RankingPlaceLinkService", () => {
  it("returns the unique exact normalized database match", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      place("place-coex", "  코엑스  "),
      place("place-aquarium", "코엑스 아쿠아리움"),
    ];

    const service = new RankingPlaceLinkService(prisma);

    await expect(
      service.resolvePlaceId({ placeName: "코엑스", areaCode: "1" }),
    ).resolves.toBe("place-coex");
    expect(prisma.place.findMany).toHaveBeenCalledWith({
      where: {
        source: "TOUR_API",
        isVisible: true,
        region: { providerCode: "11", isActive: true },
      },
      select: { id: true, title: true },
    });
  });

  it("scopes an areaCode match to its database region", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      place("place-seoul", "중앙공원", "11"),
      place("place-gyeonggi", "중앙공원", "41"),
    ];

    const service = new RankingPlaceLinkService(prisma);

    await expect(
      service.resolvePlaceId({ placeName: "중앙공원", areaCode: "31" }),
    ).resolves.toBe("place-gyeonggi");
  });

  it("returns null when exact normalized matches are ambiguous", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      place("place-1", "국립 중앙 박물관"),
      place("place-2", "국립  중앙 박물관"),
    ];

    const service = new RankingPlaceLinkService(prisma);

    await expect(
      service.resolvePlaceId({
        placeName: "국립 중앙 박물관",
        areaCode: "1",
      }),
    ).resolves.toBeNull();
  });

  it("returns null for missing and unknown-region matches", async () => {
    const prisma = new FakePrisma();
    prisma.places = [place("place-coex", "코엑스")];

    const service = new RankingPlaceLinkService(prisma);

    await expect(
      service.resolvePlaceId({ placeName: "없는 장소", areaCode: "1" }),
    ).resolves.toBeNull();
    await expect(
      service.resolvePlaceId({ placeName: "코엑스", areaCode: "999" }),
    ).resolves.toBeNull();
    expect(prisma.place.findMany).toHaveBeenCalledTimes(1);
  });

  it("requires nationwide matches to be unique", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      place("place-seoul", "중앙공원", "11"),
      place("place-gyeonggi", "중앙공원", "41"),
    ];

    const service = new RankingPlaceLinkService(prisma);

    await expect(
      service.resolvePlaceId({ placeName: "중앙공원" }),
    ).resolves.toBeNull();
  });
});
