import { Injectable } from "@nestjs/common";

import type {
  ListPlacesQuery,
  PlaceListItem,
  PlacesPage,
} from "@haetteum/contracts";

import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

function optionalText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function address(
  address1: string | null,
  address2: string | null,
): string | null {
  const parts = [optionalText(address1), optionalText(address2)].filter(
    (part): part is string => part != null,
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListPlacesQuery): Promise<PlacesPage> {
    const where: Prisma.PlaceWhereInput = {
      isVisible: true,
      region: { is: { slug: input.region, isActive: true } },
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: "insensitive" } },
              { address1: { contains: input.q, mode: "insensitive" } },
              { address2: { contains: input.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [places, totalCount] = await this.prisma.$transaction([
      this.prisma.place.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: [{ title: "asc" }, { id: "asc" }],
        include: { district: { select: { name: true } } },
      }),
      this.prisma.place.count({ where }),
    ]);

    return {
      items: places.map((place): PlaceListItem => ({
        id: place.id,
        title: place.title,
        region: input.region,
        district: place.district?.name ?? null,
        address: address(place.address1, place.address2),
        longitude: place.longitude?.toNumber() ?? null,
        latitude: place.latitude?.toNumber() ?? null,
        primaryImageUrl: place.primaryImageUrl,
        imageCopyrightType: place.imageCopyrightType,
      })),
      page: input.page,
      pageSize: input.pageSize,
      totalCount,
    };
  }
}
