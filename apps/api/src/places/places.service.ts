import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type {
  ListPlacesQuery,
  NearbyPlacesQuery,
  NearbyPlacesResponse,
  PlaceDetailResponse,
  PlaceListItem,
  PlacesPage,
} from "@haetteum/contracts";

import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TtlCache } from "../common/cache/ttl-cache.js";
import {
  KAKAO_LOCAL_PORT,
  type KakaoCategoryCode,
  type KakaoLocalPlace,
  type KakaoLocalPort,
} from "./kakao-local.client.js";
import { NEARBY_CACHE_TTL_MS } from "./places.constants.js";

function optionalText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function address(
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
  /// 성공 응답만 재사용한다 — 일시적 장애(provider_unavailable)까지 캐시하면
  /// 카카오가 복구된 뒤에도 최대 TTL만큼 계속 실패로 보일 수 있다.
  private readonly nearbyCache = new TtlCache<NearbyPlacesResponse>(
    NEARBY_CACHE_TTL_MS,
  );

  constructor(
    private readonly prisma: PrismaService,
    @Inject(KAKAO_LOCAL_PORT) private readonly kakao: KakaoLocalPort,
  ) {}

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

  async detail(placeId: string): Promise<PlaceDetailResponse> {
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, isVisible: true },
      include: {
        region: { select: { slug: true } },
        district: { select: { name: true } },
        images: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
        detailInfos: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
      },
    });
    if (place == null) throw new NotFoundException("장소를 찾을 수 없습니다.");
    const images =
      place.images.length > 0
        ? place.images.map((image) => ({
            url: image.originalUrl,
            thumbnailUrl: image.thumbnailUrl,
            alt: optionalText(image.name) ?? `${place.title} 관광지 이미지`,
            copyrightType: image.copyrightType,
          }))
        : place.primaryImageUrl
          ? [
              {
                url: place.primaryImageUrl,
                thumbnailUrl: place.primaryThumbnailUrl,
                alt: `${place.title} 관광지 이미지`,
                copyrightType: place.imageCopyrightType,
              },
            ]
          : [];
    return {
      id: place.id,
      title: place.title,
      category: {
        primary: place.category1,
        secondary: place.category2,
        tertiary: place.category3,
      },
      region: place.region.slug as PlaceDetailResponse["region"],
      district: place.district?.name ?? null,
      address: address(place.address1, place.address2),
      longitude: place.longitude?.toNumber() ?? null,
      latitude: place.latitude?.toNumber() ?? null,
      telephone: optionalText(place.telephone),
      homepage: optionalText(place.homepage),
      overview: optionalText(place.overview),
      images,
      introduction: {
        infoCenter: optionalText(place.infoCenter),
        restDate: optionalText(place.restDate),
        useSeason: optionalText(place.useSeason),
        useTime: optionalText(place.useTime),
        parking: optionalText(place.parking),
        experienceAgeRange: optionalText(place.experienceAgeRange),
        experienceGuide: optionalText(place.experienceGuide),
        babyCarriage: optionalText(place.babyCarriage),
        creditCard: optionalText(place.creditCard),
        pet: optionalText(place.pet),
      },
      information: place.detailInfos.map((item) => ({
        id: item.id,
        name: item.name,
        text: item.text,
      })),
      detailSyncedAt: place.detailSyncedAt?.toISOString() ?? null,
    };
  }

  async nearby(
    placeId: string,
    input: NearbyPlacesQuery,
  ): Promise<NearbyPlacesResponse> {
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, isVisible: true },
      select: { longitude: true, latitude: true },
    });
    if (place == null) throw new NotFoundException("장소를 찾을 수 없습니다.");
    if (place.longitude == null || place.latitude == null) {
      return { status: "unavailable", reason: "coordinates_missing" };
    }
    if (!this.kakao.isConfigured()) {
      return { status: "unavailable", reason: "provider_not_configured" };
    }
    const cacheKey = `${placeId}:${input.category}:${input.limit}`;
    const cached = this.nearbyCache.get(cacheKey);
    if (cached) return cached;

    const codes: readonly KakaoCategoryCode[] =
      input.category === "attraction"
        ? ["AT4", "CT1"]
        : input.category === "restaurant"
          ? ["FD6"]
          : ["CE7"];
    const results = await Promise.allSettled(
      codes.map((categoryCode) =>
        this.kakao.searchCategory({
          categoryCode,
          longitude: place.longitude!.toNumber(),
          latitude: place.latitude!.toNumber(),
          size: input.limit,
        }),
      ),
    );
    const fulfilled = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    if (
      fulfilled.length === 0 &&
      results.every((result) => result.status === "rejected")
    ) {
      return { status: "unavailable", reason: "provider_unavailable" };
    }
    const byId = new Map<string, KakaoLocalPlace>();
    for (const item of fulfilled) byId.set(item.id, item);
    const items = [...byId.values()]
      .sort(
        (left, right) =>
          (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
            (right.distanceMeters ?? Number.MAX_SAFE_INTEGER) ||
          left.id.localeCompare(right.id),
      )
      .slice(0, input.limit)
      .map((item) => ({
        provider: "KAKAO_LOCAL" as const,
        providerPlaceId: item.id,
        title: item.placeName,
        categoryLabel: item.categoryName,
        telephone: item.phone,
        address: item.addressName,
        roadAddress: item.roadAddressName,
        longitude: item.longitude,
        latitude: item.latitude,
        distanceMeters: item.distanceMeters,
        placeUrl: item.placeUrl,
      }));
    const response: NearbyPlacesResponse = {
      status: "ready",
      category: input.category,
      partial: results.some((result) => result.status === "rejected"),
      items,
    };
    this.nearbyCache.set(cacheKey, response);
    return response;
  }
}
