import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";

import type { ApiEnvironment } from "../config/environment.js";
import { KakaoLocalClient } from "./kakao-local.client.js";

describe("KakaoLocalClient", () => {
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
