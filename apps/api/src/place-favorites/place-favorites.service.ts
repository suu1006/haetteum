import { Injectable, NotFoundException } from "@nestjs/common";

import type {
  FavoritePlaceItem,
  MyFavoritesResponse,
} from "@haetteum/contracts";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

export const FAVORITE_SELECT = {
  id: true,
  placeId: true,
  createdAt: true,
  place: {
    select: {
      title: true,
      primaryImageUrl: true,
      region: { select: { name: true } },
      district: { select: { name: true } },
    },
  },
} satisfies Prisma.PlaceFavoriteSelect;

type FavoriteRow = Prisma.PlaceFavoriteGetPayload<{
  select: typeof FAVORITE_SELECT;
}>;

@Injectable()
export class PlaceFavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string): Promise<MyFavoritesResponse> {
    const rows = await this.prisma.placeFavorite.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: FAVORITE_SELECT,
    });

    return { items: rows.map(mapFavoriteRow) };
  }

  async add(userId: string, placeId: string): Promise<FavoritePlaceItem> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId, isVisible: true },
      select: { id: true },
    });
    if (place === null) {
      throw new NotFoundException({
        code: "PLACE_NOT_FOUND",
        detail: "장소를 찾을 수 없습니다.",
      });
    }

    try {
      return mapFavoriteRow(
        await this.prisma.placeFavorite.create({
          data: { userId, placeId },
          select: FAVORITE_SELECT,
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return mapFavoriteRow(
          await this.prisma.placeFavorite.findUniqueOrThrow({
            where: { userId_placeId: { userId, placeId } },
            select: FAVORITE_SELECT,
          }),
        );
      }

      throw error;
    }
  }

  async remove(userId: string, placeId: string): Promise<void> {
    await this.prisma.placeFavorite.deleteMany({ where: { userId, placeId } });
  }
}

function mapFavoriteRow(row: FavoriteRow): FavoritePlaceItem {
  return {
    id: row.placeId,
    title: row.place.title,
    location: [row.place.region.name, row.place.district?.name]
      .filter((value): value is string => value !== undefined)
      .join(" "),
    primaryImageUrl: row.place.primaryImageUrl,
    favoritedAt: row.createdAt.toISOString(),
  };
}
