import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import { Prisma } from "../generated/prisma/client.js";
import type { KakaoLocalPlace } from "./kakao-local.client.js";
import { PlaceCourseBuilderService } from "./place-course-builder.service.js";

const anchorRow = {
  id: "24684077-a907-45c3-85bf-b509dab12377",
  title: "에버랜드",
  address1: " 경기 용인시 ",
  address2: null,
  longitude: new Prisma.Decimal("127.2025"),
  latitude: new Prisma.Decimal("37.2939"),
};

function placeAt(
  id: string,
  placeName: string,
  categoryName: string,
  distanceMeters: number,
): KakaoLocalPlace {
  return {
    id,
    placeName,
    categoryName,
    phone: null,
    addressName: "경기 용인시",
    roadAddressName: null,
    longitude: 127.203,
    latitude: 37.294,
    placeUrl: `http://place.map.kakao.com/${id}`,
    distanceMeters,
  };
}

describe("PlaceCourseBuilderService", () => {
  it("raises a not-found error for an unknown or hidden place", async () => {
    const findFirst = jest.fn<() => Promise<any>>().mockResolvedValue(null);
    const service = new PlaceCourseBuilderService(
      { place: { findFirst } } as never,
      {} as never,
    );

    await expect(service.buildForPlace("missing-id")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("reports coordinates_missing when the anchor place has no coordinates", async () => {
    const findFirst = jest
      .fn<() => Promise<any>>()
      .mockResolvedValue({ ...anchorRow, longitude: null, latitude: null });
    const service = new PlaceCourseBuilderService(
      { place: { findFirst } } as never,
      { isConfigured: () => true } as never,
    );

    await expect(service.buildForPlace(anchorRow.id)).resolves.toEqual({
      status: "unavailable",
      reason: "coordinates_missing",
    });
  });

  it("reports provider_not_configured without calling Kakao", async () => {
    const findFirst = jest
      .fn<() => Promise<any>>()
      .mockResolvedValue(anchorRow);
    const service = new PlaceCourseBuilderService(
      { place: { findFirst } } as never,
      { isConfigured: () => false } as never,
    );

    await expect(service.buildForPlace(anchorRow.id)).resolves.toEqual({
      status: "unavailable",
      reason: "provider_not_configured",
    });
  });

  it("builds an anchor → attraction → cafe → restaurant course from the nearest pick per slot", async () => {
    const findFirst = jest
      .fn<() => Promise<any>>()
      .mockResolvedValue(anchorRow);
    const searchCategory = jest.fn(
      ({
        categoryCode,
      }: {
        categoryCode: string;
      }): Promise<readonly KakaoLocalPlace[]> => {
        if (categoryCode === "AT4") {
          return Promise.resolve([
            placeAt("1", "캐리비안 베이", "관광,명소 > 워터파크", 300),
          ]);
        }
        if (categoryCode === "CT1") return Promise.resolve([]);
        if (categoryCode === "CE7") {
          return Promise.resolve([
            placeAt("2", "에버랜드 카페", "음식점 > 카페", 150),
          ]);
        }
        return Promise.resolve([
          placeAt("3", "에버랜드 푸드코트", "음식점 > 한식", 200),
        ]);
      },
    );
    const service = new PlaceCourseBuilderService(
      { place: { findFirst } } as never,
      { isConfigured: () => true, searchCategory },
    );

    const result = await service.buildForPlace(anchorRow.id);

    expect(result).toMatchObject({ status: "ready", partial: false });
    if (result.status !== "ready") throw new Error("expected ready");
    expect(
      result.stops.map((stop) => [stop.role, stop.sequence, stop.title]),
    ).toEqual([
      ["anchor", 1, "에버랜드"],
      ["attraction", 2, "캐리비안 베이"],
      ["cafe", 3, "에버랜드 카페"],
      ["restaurant", 4, "에버랜드 푸드코트"],
    ]);
    expect(result.stops[0]).toMatchObject({
      placeId: anchorRow.id,
      address: "경기 용인시",
      placeUrl: null,
    });
  });

  it("skips a candidate that is the anchor place itself and falls through to the next one", async () => {
    const findFirst = jest
      .fn<() => Promise<any>>()
      .mockResolvedValue(anchorRow);
    const searchCategory = jest.fn(
      ({
        categoryCode,
      }: {
        categoryCode: string;
      }): Promise<readonly KakaoLocalPlace[]> => {
        if (categoryCode === "AT4") {
          return Promise.resolve([
            placeAt("1", "에버랜드", "관광,명소 > 테마파크", 5),
            placeAt("2", "캐리비안 베이", "관광,명소 > 워터파크", 300),
          ]);
        }
        return Promise.resolve([]);
      },
    );
    const service = new PlaceCourseBuilderService(
      { place: { findFirst } } as never,
      { isConfigured: () => true, searchCategory },
    );

    const result = await service.buildForPlace(anchorRow.id);

    expect(result).toMatchObject({ status: "ready", partial: true });
    if (result.status !== "ready") throw new Error("expected ready");
    expect(result.stops.map((stop) => stop.title)).toEqual([
      "에버랜드",
      "캐리비안 베이",
    ]);
  });

  it("marks the course partial when a slot comes up empty, and unavailable when every slot fails", async () => {
    const findFirst = jest
      .fn<() => Promise<any>>()
      .mockResolvedValue(anchorRow);
    const emptySearch = jest
      .fn<() => Promise<readonly KakaoLocalPlace[]>>()
      .mockResolvedValue([]);
    const service = new PlaceCourseBuilderService(
      { place: { findFirst } } as never,
      { isConfigured: () => true, searchCategory: emptySearch },
    );

    await expect(service.buildForPlace(anchorRow.id)).resolves.toEqual({
      status: "unavailable",
      reason: "provider_unavailable",
    });
  });

  it("caches a ready course so a repeated request skips the Kakao calls", async () => {
    const findFirst = jest
      .fn<() => Promise<any>>()
      .mockResolvedValue(anchorRow);
    const searchCategory = jest
      .fn<() => Promise<readonly KakaoLocalPlace[]>>()
      .mockResolvedValue([
        placeAt("1", "캐리비안 베이", "관광,명소 > 워터파크", 300),
      ]);
    const service = new PlaceCourseBuilderService(
      { place: { findFirst } } as never,
      { isConfigured: () => true, searchCategory },
    );

    const first = await service.buildForPlace(anchorRow.id);
    const second = await service.buildForPlace(anchorRow.id);

    expect(first).toEqual(second);
    const callsAfterFirst = searchCategory.mock.calls.length;
    await service.buildForPlace(anchorRow.id);
    expect(searchCategory.mock.calls.length).toBe(callsAfterFirst);
  });
});
