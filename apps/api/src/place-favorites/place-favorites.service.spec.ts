import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import { Prisma } from "../generated/prisma/client.js";
import {
  FAVORITE_SELECT,
  PlaceFavoritesService,
} from "./place-favorites.service.js";

const FAVORITE_ID = "10000000-0000-4000-8000-000000000001";
const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const USER_ID = "30000000-0000-4000-8000-000000000001";

function favoriteRow(districtName: string | null = "용인") {
  return {
    id: FAVORITE_ID,
    placeId: PLACE_ID,
    createdAt: new Date("2026-08-25T03:00:00.000Z"),
    place: {
      title: "에버랜드",
      primaryImageUrl: "https://example.test/everland.jpg",
      region: { name: "경기" },
      district: districtName === null ? null : { name: districtName },
    },
  };
}

describe("PlaceFavoritesService", () => {
  it("lists the passed user's favorites in deterministic recency order with place display data", async () => {
    const row = favoriteRow();
    const findMany = jest
      .fn<() => Promise<(typeof row)[]>>()
      .mockResolvedValue([row]);
    const service = new PlaceFavoritesService({
      placeFavorite: { findMany },
    } as never);

    await expect(service.listMine(USER_ID)).resolves.toEqual({
      items: [
        {
          id: PLACE_ID,
          title: "에버랜드",
          location: "경기 용인",
          primaryImageUrl: "https://example.test/everland.jpg",
          favoritedAt: "2026-08-25T03:00:00.000Z",
        },
      ],
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: FAVORITE_SELECT,
    });
  });

  it("uses the region name when a favorited place has no district", async () => {
    const row = favoriteRow(null);
    const findMany = jest
      .fn<() => Promise<(typeof row)[]>>()
      .mockResolvedValue([row]);
    const service = new PlaceFavoritesService({
      placeFavorite: { findMany },
    } as never);

    await expect(service.listMine(USER_ID)).resolves.toMatchObject({
      items: [{ location: "경기" }],
    });
  });

  it("adds a favorite for a visible place owned by the passed user", async () => {
    const row = favoriteRow();
    const placeFindUnique = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValue({ id: PLACE_ID });
    const favoriteCreate = jest
      .fn<() => Promise<typeof row>>()
      .mockResolvedValue(row);
    const service = new PlaceFavoritesService({
      place: { findUnique: placeFindUnique },
      placeFavorite: { create: favoriteCreate },
    } as never);

    await expect(service.add(USER_ID, PLACE_ID)).resolves.toEqual({
      id: PLACE_ID,
      title: "에버랜드",
      location: "경기 용인",
      primaryImageUrl: "https://example.test/everland.jpg",
      favoritedAt: "2026-08-25T03:00:00.000Z",
    });
    expect(placeFindUnique).toHaveBeenCalledWith({
      where: { id: PLACE_ID, isVisible: true },
      select: { id: true },
    });
    expect(favoriteCreate).toHaveBeenCalledWith({
      data: { userId: USER_ID, placeId: PLACE_ID },
      select: FAVORITE_SELECT,
    });
  });

  it("rejects a missing or hidden favorite place without attempting a create", async () => {
    const placeFindUnique = jest
      .fn<() => Promise<null>>()
      .mockResolvedValue(null);
    const favoriteCreate = jest.fn();
    const service = new PlaceFavoritesService({
      place: { findUnique: placeFindUnique },
      placeFavorite: { create: favoriteCreate },
    } as never);

    await expect(service.add(USER_ID, PLACE_ID)).rejects.toEqual(
      new NotFoundException({
        code: "PLACE_NOT_FOUND",
        detail: "장소를 찾을 수 없습니다.",
      }),
    );
    expect(favoriteCreate).not.toHaveBeenCalled();
  });

  it("returns the existing favorite instead of erroring on a duplicate add", async () => {
    const row = favoriteRow();
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      "duplicate favorite",
      { code: "P2002", clientVersion: "7.9.1" },
    );
    const placeFindUnique = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValue({ id: PLACE_ID });
    const favoriteCreate = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue(duplicateError);
    const findUniqueOrThrow = jest
      .fn<() => Promise<typeof row>>()
      .mockResolvedValue(row);
    const service = new PlaceFavoritesService({
      place: { findUnique: placeFindUnique },
      placeFavorite: { create: favoriteCreate, findUniqueOrThrow },
    } as never);

    await expect(service.add(USER_ID, PLACE_ID)).resolves.toEqual({
      id: PLACE_ID,
      title: "에버랜드",
      location: "경기 용인",
      primaryImageUrl: "https://example.test/everland.jpg",
      favoritedAt: "2026-08-25T03:00:00.000Z",
    });
    expect(findUniqueOrThrow).toHaveBeenCalledWith({
      where: { userId_placeId: { userId: USER_ID, placeId: PLACE_ID } },
      select: FAVORITE_SELECT,
    });
  });

  it("rethrows a non-duplicate Prisma error", async () => {
    const originalError = new Prisma.PrismaClientKnownRequestError(
      "foreign key failure",
      { code: "P2003", clientVersion: "7.9.1" },
    );
    const placeFindUnique = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValue({ id: PLACE_ID });
    const favoriteCreate = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue(originalError);
    const service = new PlaceFavoritesService({
      place: { findUnique: placeFindUnique },
      placeFavorite: { create: favoriteCreate },
    } as never);

    await expect(service.add(USER_ID, PLACE_ID)).rejects.toBe(originalError);
  });

  it("removes a favorite scoped to the passed user", async () => {
    const deleteMany = jest
      .fn<() => Promise<{ count: number }>>()
      .mockResolvedValue({ count: 1 });
    const service = new PlaceFavoritesService({
      placeFavorite: { deleteMany },
    } as never);

    await expect(service.remove(USER_ID, PLACE_ID)).resolves.toBeUndefined();
    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, placeId: PLACE_ID },
    });
  });

  it("does not throw when removing a favorite that no longer exists", async () => {
    const deleteMany = jest
      .fn<() => Promise<{ count: number }>>()
      .mockResolvedValue({ count: 0 });
    const service = new PlaceFavoritesService({
      placeFavorite: { deleteMany },
    } as never);

    await expect(service.remove(USER_ID, PLACE_ID)).resolves.toBeUndefined();
  });
});
