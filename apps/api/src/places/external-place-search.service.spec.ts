import { jest } from "@jest/globals";

import { Prisma } from "../generated/prisma/client.js";
import type { KakaoLocalPlace, KakaoLocalPort } from "./kakao-local.client.js";
import { ExternalPlaceSearchService } from "./external-place-search.service.js";

const palace: KakaoLocalPlace = {
  id: "18619553",
  placeName: "경복궁",
  categoryName: "여행 > 관광,명소 > 궁궐",
  phone: "02-3700-3900",
  addressName: "서울 종로구 세종로 1-91",
  roadAddressName: "서울 종로구 사직로 161",
  longitude: 126.976897,
  latitude: 37.577608,
  placeUrl: "https://place.map.kakao.com/18619553",
  distanceMeters: null,
};

function kakaoLocalStub(
  overrides: Partial<KakaoLocalPort> = {},
): KakaoLocalPort {
  return {
    isConfigured: () => false,
    searchKeyword: () => Promise.resolve([]),
    searchCategory: () => Promise.resolve([]),
    searchImage: () => Promise.resolve(null),
    ...overrides,
  };
}

describe("ExternalPlaceSearchService", () => {
  it("returns provider_not_configured before searching Kakao or the database", async () => {
    const searchKeyword = jest.fn<() => Promise<readonly KakaoLocalPlace[]>>();
    const queryRaw = jest.fn<() => Promise<unknown[]>>();
    const service = new ExternalPlaceSearchService(
      { $queryRaw: queryRaw } as never,
      kakaoLocalStub({ searchKeyword }),
    );

    await expect(service.search({ q: "경복궁" })).resolves.toEqual({
      status: "unavailable",
      reason: "provider_not_configured",
    });
    expect(searchKeyword).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("returns provider_unavailable and retries the provider on the next request", async () => {
    const searchKeyword = jest
      .fn<() => Promise<readonly KakaoLocalPlace[]>>()
      .mockRejectedValue(new Error("provider failed"));
    const service = new ExternalPlaceSearchService(
      { $queryRaw: jest.fn() } as never,
      kakaoLocalStub({ isConfigured: () => true, searchKeyword }),
    );

    await expect(service.search({ q: "경복궁" })).resolves.toEqual({
      status: "unavailable",
      reason: "provider_unavailable",
    });
    await expect(service.search({ q: "경복궁" })).resolves.toEqual({
      status: "unavailable",
      reason: "provider_unavailable",
    });
    expect(searchKeyword).toHaveBeenCalledTimes(2);
  });

  it("keeps relevance order, filters an explicit region, and removes duplicate provider IDs", async () => {
    const searchKeyword = jest
      .fn<() => Promise<readonly KakaoLocalPlace[]>>()
      .mockResolvedValue([
        palace,
        { ...palace, placeName: "중복 경복궁" },
        {
          ...palace,
          id: "20568040",
          placeName: "해운대해수욕장",
          addressName: "부산 해운대구 우동",
          roadAddressName: "부산 해운대구 해운대해변로 264",
          placeUrl: "https://place.map.kakao.com/20568040",
        },
      ]);
    const searchImage = jest
      .fn<(query: string) => Promise<string | null>>()
      .mockResolvedValue("https://search1.kakaocdn.net/argon/thumb.jpg");
    const service = new ExternalPlaceSearchService(
      {
        $queryRaw: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      } as never,
      kakaoLocalStub({ isConfigured: () => true, searchKeyword, searchImage }),
    );

    const result = await service.search({ q: "경복궁", region: "seoul" });
    expect(searchImage).toHaveBeenCalledWith("서울 경복궁");

    expect(searchKeyword).toHaveBeenCalledWith({ query: "경복궁", size: 15 });
    expect(result).toEqual({
      status: "ready",
      items: [
        {
          provider: "KAKAO_LOCAL",
          providerPlaceId: "18619553",
          title: "경복궁",
          categoryLabel: "여행 > 관광,명소 > 궁궐",
          telephone: "02-3700-3900",
          address: "서울 종로구 세종로 1-91",
          roadAddress: "서울 종로구 사직로 161",
          longitude: 126.976897,
          latitude: 37.577608,
          distanceMeters: null,
          placeUrl: "https://place.map.kakao.com/18619553",
          imageUrl: "https://search1.kakaocdn.net/argon/thumb.jpg",
          matchedPlaceId: null,
        },
      ],
    });
  });

  it("matches only normalized exact titles with close coordinates or the same full address", async () => {
    const closeId = "10000000-0000-4000-8000-000000000001";
    const addressId = "10000000-0000-4000-8000-000000000002";
    const farId = "10000000-0000-4000-8000-000000000003";
    const searchKeyword = jest
      .fn<() => Promise<readonly KakaoLocalPlace[]>>()
      .mockResolvedValue([
        palace,
        {
          ...palace,
          id: "2",
          placeName: " 북 촌 한옥마을 ",
          addressName: "서울 종로구 계동 105",
          roadAddressName: "서울 종로구 계동길 37",
          longitude: 126.9862,
          latitude: 37.5826,
          placeUrl: "https://place.map.kakao.com/2",
        },
        {
          ...palace,
          id: "3",
          placeName: "창덕궁",
          addressName: "서울 종로구 와룡동 2-71",
          roadAddressName: "서울 종로구 율곡로 99",
          longitude: 129.1,
          latitude: 35.1,
          placeUrl: "https://place.map.kakao.com/3",
        },
      ]);
    const queryRaw = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      {
        id: closeId,
        title: " 경복 궁 ",
        address1: "다른 주소",
        address2: null,
        longitude: new Prisma.Decimal("126.9770"),
        latitude: new Prisma.Decimal("37.5776"),
      },
      {
        id: addressId,
        title: "북촌한옥마을",
        address1: " 서울 종로구 계동길 37 ",
        address2: null,
        longitude: null,
        latitude: null,
      },
      {
        id: farId,
        title: "창덕궁",
        address1: "서울 종로구 다른길 1",
        address2: null,
        longitude: new Prisma.Decimal("126.991"),
        latitude: new Prisma.Decimal("37.579"),
      },
      {
        id: "10000000-0000-4000-8000-000000000004",
        title: "이름이 다른 장소",
        address1: "서울 종로구 사직로 161",
        address2: null,
        longitude: new Prisma.Decimal("126.976897"),
        latitude: new Prisma.Decimal("37.577608"),
      },
    ]);
    const service = new ExternalPlaceSearchService(
      { $queryRaw: queryRaw } as never,
      kakaoLocalStub({ isConfigured: () => true, searchKeyword }),
    );

    const result = await service.search({ q: "궁", region: "seoul" });

    expect(result).toMatchObject({
      status: "ready",
      items: [
        { providerPlaceId: "18619553", matchedPlaceId: closeId },
        { providerPlaceId: "2", matchedPlaceId: addressId },
        { providerPlaceId: "3", matchedPlaceId: null },
      ],
    });
    const query = queryRaw.mock.calls[0]?.[0] as unknown as {
      strings: readonly string[];
      values: readonly unknown[];
    };
    expect(query.strings.join("?")).toContain('normalize(p."title", NFKC)');
    expect(query.strings.join("?")).not.toContain("LIMIT");
    expect(query.values).toEqual(
      expect.arrayContaining(["seoul", "경복궁", "북촌한옥마을", "창덕궁"]),
    );
  });

  it("preserves numeric address boundaries and building qualifiers", async () => {
    const internalId = "10000000-0000-4000-8000-000000000005";
    const searchKeyword = jest
      .fn<() => Promise<readonly KakaoLocalPlace[]>>()
      .mockResolvedValue([
        {
          ...palace,
          longitude: 126.9,
          latitude: 37.5,
        },
        {
          ...palace,
          id: "18619554",
          roadAddressName: "서울 종로구 사직로 16 1",
          longitude: 126.9,
          latitude: 37.5,
          placeUrl: "https://place.map.kakao.com/18619554",
        },
        {
          ...palace,
          id: "18619555",
          roadAddressName: "서울 종로구 사직로 161 (102동)",
          longitude: 126.9,
          latitude: 37.5,
          placeUrl: "https://place.map.kakao.com/18619555",
        },
      ]);
    const queryRaw = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      {
        id: internalId,
        title: "경복궁",
        address1: "서울특별시 종로구 사직로 161",
        address2: "(101동)",
        longitude: new Prisma.Decimal("127.2"),
        latitude: new Prisma.Decimal("37.8"),
      },
    ]);
    const service = new ExternalPlaceSearchService(
      { $queryRaw: queryRaw } as never,
      kakaoLocalStub({ isConfigured: () => true, searchKeyword }),
    );

    const result = await service.search({ q: "경복궁", region: "seoul" });

    expect(result).toMatchObject({
      status: "ready",
      items: [
        { providerPlaceId: "18619553", matchedPlaceId: null },
        { providerPlaceId: "18619554", matchedPlaceId: null },
        { providerPlaceId: "18619555", matchedPlaceId: null },
      ],
    });
  });

  it("matches the live palace address after removing its named administrative neighborhood", async () => {
    const internalId = "10000000-0000-4000-8000-000000000006";
    const searchKeyword = jest
      .fn<() => Promise<readonly KakaoLocalPlace[]>>()
      .mockResolvedValue([{ ...palace, longitude: 126.9, latitude: 37.5 }]);
    const queryRaw = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      {
        id: internalId,
        title: "경복궁",
        address1: "서울특별시 종로구 사직로 161",
        address2: "(세종로)",
        longitude: new Prisma.Decimal("127.2"),
        latitude: new Prisma.Decimal("37.8"),
      },
    ]);
    const service = new ExternalPlaceSearchService(
      { $queryRaw: queryRaw } as never,
      kakaoLocalStub({ isConfigured: () => true, searchKeyword }),
    );

    await expect(
      service.search({ q: "경복궁", region: "seoul" }),
    ).resolves.toMatchObject({
      status: "ready",
      items: [{ providerPlaceId: "18619553", matchedPlaceId: internalId }],
    });
  });
});
