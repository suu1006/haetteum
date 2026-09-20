import { Inject, Injectable } from "@nestjs/common";

import { PlaceRegionSchema } from "@haetteum/contracts";
import type {
  ExternalPlaceSearchItem,
  ExternalPlaceSearchQuery,
  ExternalPlaceSearchResponse,
  PlaceRegion,
} from "@haetteum/contracts";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  KAKAO_LOCAL_PORT,
  type KakaoLocalPlace,
  type KakaoLocalPort,
} from "./kakao-local.client.js";
import { address } from "./places.service.js";

const SEARCH_RESULT_SIZE = 15;
const INTERNAL_MATCH_RADIUS_METERS = 100;

const REGION_SUBDIVISIONS: Record<PlaceRegion, readonly string[]> = {
  seoul: ["서울", "서울특별시"],
  gyeonggi: ["경기", "경기도"],
  gangwon: ["강원", "강원도", "강원특별자치도"],
  busan: ["부산", "부산광역시"],
  jeju: ["제주", "제주도", "제주특별자치도"],
};

const CANONICAL_SUBDIVISION = new Map(
  Object.values(REGION_SUBDIVISIONS).flatMap(([canonical, ...aliases]) =>
    [canonical, ...aliases].map((name) => [name, canonical] as const),
  ),
);

type InternalPlaceCandidate = {
  id: string;
  title: string;
  address1: string | null;
  address2: string | null;
  longitude: Prisma.Decimal | null;
  latitude: Prisma.Decimal | null;
};

function normalizedText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

function normalizedAddress(value: string): string {
  const withoutAdministrativeNeighborhood = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s*\([가-힣][가-힣0-9]*(?:동|가|읍|면|리|로)\)\s*$/u, "")
    .trim()
    .replace(/\s+/gu, " ");
  const [subdivision, ...rest] = withoutAdministrativeNeighborhood.split(" ");
  const canonicalSubdivision = CANONICAL_SUBDIVISION.get(subdivision);
  return [canonicalSubdivision ?? subdivision, ...rest].join(" ");
}

function belongsToRegion(place: KakaoLocalPlace, region: PlaceRegion): boolean {
  const subdivisions = REGION_SUBDIVISIONS[region];
  return [place.roadAddressName, place.addressName].some((value) => {
    const firstSubdivision = value?.trim().split(/\s+/, 1)[0];
    return firstSubdivision != null && subdivisions.includes(firstSubdivision);
  });
}

function distanceMeters(
  left: { longitude: number; latitude: number },
  right: { longitude: number; latitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function isSameAddress(
  candidate: InternalPlaceCandidate,
  external: KakaoLocalPlace,
): boolean {
  const candidateAddress = address(candidate.address1, candidate.address2);
  if (candidateAddress == null) return false;
  const normalizedCandidate = normalizedAddress(candidateAddress);
  return [external.addressName, external.roadAddressName].some(
    (value) =>
      value != null && normalizedAddress(value) === normalizedCandidate,
  );
}

function isClose(
  candidate: InternalPlaceCandidate,
  external: KakaoLocalPlace,
): boolean {
  if (candidate.longitude == null || candidate.latitude == null) return false;
  return (
    distanceMeters(
      {
        longitude: candidate.longitude.toNumber(),
        latitude: candidate.latitude.toNumber(),
      },
      external,
    ) <= INTERNAL_MATCH_RADIUS_METERS
  );
}

function matchedPlaceId(
  external: KakaoLocalPlace,
  candidates: readonly InternalPlaceCandidate[],
): string | null {
  const normalizedTitle = normalizedText(external.placeName);
  const matches = candidates.filter(
    (candidate) =>
      normalizedText(candidate.title) === normalizedTitle &&
      (isClose(candidate, external) || isSameAddress(candidate, external)),
  );
  return (
    matches.sort((left, right) => left.id.localeCompare(right.id))[0]?.id ??
    null
  );
}

function toResponseItem(
  place: KakaoLocalPlace,
  candidates: readonly InternalPlaceCandidate[],
  imageUrl: string | null,
): ExternalPlaceSearchItem {
  return {
    provider: "KAKAO_LOCAL",
    providerPlaceId: place.id,
    title: place.placeName,
    categoryLabel: place.categoryName,
    telephone: place.phone,
    address: place.addressName,
    roadAddress: place.roadAddressName,
    longitude: place.longitude,
    latitude: place.latitude,
    distanceMeters: place.distanceMeters,
    placeUrl: place.placeUrl,
    imageUrl,
    matchedPlaceId: matchedPlaceId(place, candidates),
  };
}

@Injectable()
export class ExternalPlaceSearchService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(KAKAO_LOCAL_PORT) private readonly kakao: KakaoLocalPort,
  ) {}

  async search(
    input: ExternalPlaceSearchQuery,
  ): Promise<ExternalPlaceSearchResponse> {
    if (!this.kakao.isConfigured()) {
      return { status: "unavailable", reason: "provider_not_configured" };
    }

    let providerPlaces: readonly KakaoLocalPlace[];
    try {
      providerPlaces = await this.kakao.searchKeyword({
        query: input.q,
        size: SEARCH_RESULT_SIZE,
      });
    } catch {
      return { status: "unavailable", reason: "provider_unavailable" };
    }

    const placesByProviderId = new Map<string, KakaoLocalPlace>();
    for (const place of providerPlaces) {
      if (!placesByProviderId.has(place.id))
        placesByProviderId.set(place.id, place);
    }
    const uniquePlaces = [...placesByProviderId.values()].filter(
      (place) => input.region == null || belongsToRegion(place, input.region),
    );
    if (uniquePlaces.length === 0) return { status: "ready", items: [] };

    const normalizedTitles = [
      ...new Set(uniquePlaces.map((place) => normalizedText(place.placeName))),
    ];
    const regionSlugs = input.region
      ? [input.region]
      : [...PlaceRegionSchema.options];
    const candidates = await this.prisma.$queryRaw<InternalPlaceCandidate[]>(
      Prisma.sql`
        SELECT
          p."id",
          p."title",
          p."address1",
          p."address2",
          p."longitude",
          p."latitude"
        FROM "places" AS p
        INNER JOIN "tourism_regions" AS r ON r."id" = p."region_id"
        WHERE p."is_visible" = TRUE
          AND r."is_active" = TRUE
          AND r."slug" IN (${Prisma.join(regionSlugs)})
          AND lower(
            regexp_replace(
              normalize(p."title", NFKC),
              '[[:space:]]+',
              '',
              'g'
            )
          ) IN (${Prisma.join(normalizedTitles)})
      `,
    );

    // 이미지는 부가 정보라 개별 실패는 null로 넘긴다. 지역명을 붙여 동명 장소 오매칭을 줄인다.
    const imageUrls = await Promise.all(
      uniquePlaces.map((place) => {
        const subdivision = (place.roadAddressName ?? place.addressName)
          ?.trim()
          .split(/\s+/, 1)[0];
        return this.kakao
          .searchImage([subdivision, place.placeName].filter(Boolean).join(" "))
          .catch(() => null);
      }),
    );

    return {
      status: "ready",
      items: uniquePlaces.map((place, index) =>
        toResponseItem(place, candidates, imageUrls[index] ?? null),
      ),
    };
  }
}
