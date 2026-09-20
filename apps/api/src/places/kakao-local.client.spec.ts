import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";

import type { ApiEnvironment } from "../config/environment.js";
import { KakaoLocalClient } from "./kakao-local.client.js";

describe("KakaoLocalClient", () => {
  it("calls the fixed keyword endpoint without category or location restrictions", async () => {
    const fetch = jest.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          meta: { total_count: 1, pageable_count: 1, is_end: true },
          documents: [
            {
              id: "18619553",
              place_name: "경복궁",
              category_name: "여행 > 관광,명소 > 궁궐",
              phone: "02-3700-3900",
              address_name: "서울 종로구 세종로 1-91",
              road_address_name: "서울 종로구 사직로 161",
              x: "126.976897",
              y: "37.577608",
              place_url: "https://place.map.kakao.com/18619553",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const config = {
      get: jest.fn(() => "kakao-test-key"),
    } as unknown as ConfigService<ApiEnvironment, true>;
    const client = new KakaoLocalClient(config, fetch);

    await expect(
      client.searchKeyword({ query: "경복궁", size: 15 }),
    ).resolves.toEqual([
      {
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
      },
    ]);

    const [input] = fetch.mock.calls[0] ?? [];
    if (!(input instanceof URL)) throw new Error("Expected URL request input");
    expect(input.origin).toBe("https://dapi.kakao.com");
    expect(input.pathname).toBe("/v2/local/search/keyword.json");
    expect(input.searchParams.get("query")).toBe("경복궁");
    expect(input.searchParams.get("page")).toBe("1");
    expect(input.searchParams.get("size")).toBe("15");
    expect(input.searchParams.get("sort")).toBe("accuracy");
    expect(input.searchParams.has("category_group_code")).toBe(false);
    expect(input.searchParams.has("radius")).toBe(false);
    expect(input.searchParams.has("x")).toBe(false);
    expect(input.searchParams.has("y")).toBe(false);
  });

  it.each([
    ["a nonnumeric provider ID", { id: "place-1" }],
    ["a blank longitude", { x: "   " }],
    ["longitude outside geographic bounds", { x: "181" }],
    ["latitude outside geographic bounds", { y: "-91" }],
    ["an arbitrary external place URL", { place_url: "https://example.com/1" }],
  ])("rejects %s at the provider boundary", async (_label, override) => {
    const fetch = jest.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          meta: { total_count: 1, pageable_count: 1, is_end: true },
          documents: [
            {
              id: "18619553",
              place_name: "경복궁",
              category_name: "여행 > 관광,명소 > 궁궐",
              phone: "",
              address_name: "서울 종로구 세종로 1-91",
              road_address_name: "",
              x: "126.976897",
              y: "37.577608",
              place_url: "https://place.map.kakao.com/18619553",
              ...override,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const config = {
      get: jest.fn(() => "kakao-test-key"),
    } as unknown as ConfigService<ApiEnvironment, true>;
    const client = new KakaoLocalClient(config, fetch);

    await expect(
      client.searchKeyword({ query: "경복궁", size: 15 }),
    ).rejects.toMatchObject({ providerCode: "INVALID_RESPONSE" });
  });

  it("calls the fixed category endpoint and normalizes factual fields", async () => {
    const fetch = jest.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          meta: { total_count: 1, pageable_count: 1, is_end: true },
          documents: [
            {
              id: "26338954",
              place_name: "한식당",
              category_name: "음식점 > 한식",
              phone: "",
              address_name: "경기 용인시",
              road_address_name: "",
              x: "127.059",
              y: "37.512",
              place_url: "https://place.map.kakao.com/26338954",
              distance: "418",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const config = {
      get: jest.fn(() => "kakao-test-key"),
    } as unknown as ConfigService<ApiEnvironment, true>;
    const client = new KakaoLocalClient(config, fetch);

    await expect(
      client.searchCategory({
        categoryCode: "FD6",
        longitude: 127.1,
        latitude: 37.4,
        size: 10,
      }),
    ).resolves.toEqual([
      {
        id: "26338954",
        placeName: "한식당",
        categoryName: "음식점 > 한식",
        phone: null,
        addressName: "경기 용인시",
        roadAddressName: null,
        longitude: 127.059,
        latitude: 37.512,
        placeUrl: "https://place.map.kakao.com/26338954",
        distanceMeters: 418,
      },
    ]);

    const [input, init] = fetch.mock.calls[0] ?? [];
    if (!(input instanceof URL)) throw new Error("Expected URL request input");
    const url = input;
    expect(url.origin).toBe("https://dapi.kakao.com");
    expect(url.pathname).toBe("/v2/local/search/category.json");
    expect(url.searchParams.get("category_group_code")).toBe("FD6");
    expect(url.searchParams.get("sort")).toBe("distance");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "KakaoAK kakao-test-key",
    );
  });

  it("returns only kakaocdn thumbnails from image search", async () => {
    const respond = (thumbnail_url: string) =>
      new Response(JSON.stringify({ documents: [{ thumbnail_url }] }), {
        status: 200,
      });
    const fetch = jest
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        respond("https://search1.kakaocdn.net/argon/130x130_85_c/a"),
      )
      .mockResolvedValueOnce(respond("https://evil.example.com/a.jpg"));
    const config = {
      get: jest.fn(() => "kakao-test-key"),
    } as unknown as ConfigService<ApiEnvironment, true>;
    const client = new KakaoLocalClient(config, fetch);

    await expect(client.searchImage("서울 경복궁")).resolves.toBe(
      "https://search1.kakaocdn.net/argon/600x0_65_wr/a",
    );
    await expect(client.searchImage("서울 경복궁")).resolves.toBeNull();
    expect((fetch.mock.calls[0]?.[0] as URL).pathname).toBe("/v2/search/image");
  });

  it("reports whether the optional provider key is configured", () => {
    const config = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService<ApiEnvironment, true>;
    const client = new KakaoLocalClient(
      config,
      jest.fn<typeof globalThis.fetch>(),
    );
    expect(client.isConfigured()).toBe(false);
  });
});
