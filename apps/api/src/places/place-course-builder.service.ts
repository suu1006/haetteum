import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type {
  GeneratedCourseResponse,
  GeneratedCourseStop,
  GeneratedCourseStopRole,
} from "@haetteum/contracts";

import { TtlCache } from "../common/cache/ttl-cache.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  KAKAO_LOCAL_PORT,
  type KakaoCategoryCode,
  type KakaoLocalPlace,
  type KakaoLocalPort,
} from "./kakao-local.client.js";
import { address } from "./places.service.js";
import {
  GENERATED_COURSE_CACHE_TTL_MS,
  GENERATED_COURSE_CANDIDATE_SIZE,
  GENERATED_COURSE_SELF_MATCH_RADIUS_METERS,
} from "./places.constants.js";

type CourseSlot = {
  role: Exclude<GeneratedCourseStopRole, "anchor">;
  codes: readonly KakaoCategoryCode[];
};

/// 관광지 → 명소 → 카페 → 밥집. 고정 순서, 점수 계산 없이 슬롯별 최근접 1곳만 채택한다.
const COURSE_PLAN: readonly CourseSlot[] = [
  { role: "attraction", codes: ["AT4", "CT1"] },
  { role: "cafe", codes: ["CE7"] },
  { role: "restaurant", codes: ["FD6"] },
];

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, "").toLowerCase();
}

/// 카테고리 검색은 기준 관광지 좌표 근처를 뒤지므로, 관광지 자신이 명소 후보로 다시 잡힐 수 있다.
function isAnchorItself(
  candidate: KakaoLocalPlace,
  anchorTitle: string,
): boolean {
  if (
    candidate.distanceMeters !== null &&
    candidate.distanceMeters <= GENERATED_COURSE_SELF_MATCH_RADIUS_METERS
  ) {
    return true;
  }
  return normalizeTitle(candidate.placeName) === normalizeTitle(anchorTitle);
}

type SlotResult = {
  candidate: KakaoLocalPlace | null;
};

@Injectable()
export class PlaceCourseBuilderService {
  /// 성공 응답만 재사용한다 — nearby()와 같은 이유(일시 장애를 TTL만큼 고정시키지 않기 위함)
  private readonly cache = new TtlCache<GeneratedCourseResponse>(
    GENERATED_COURSE_CACHE_TTL_MS,
  );

  constructor(
    private readonly prisma: PrismaService,
    @Inject(KAKAO_LOCAL_PORT) private readonly kakao: KakaoLocalPort,
  ) {}

  async buildForPlace(placeId: string): Promise<GeneratedCourseResponse> {
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, isVisible: true },
      select: {
        id: true,
        title: true,
        address1: true,
        address2: true,
        longitude: true,
        latitude: true,
      },
    });
    if (place == null) throw new NotFoundException("장소를 찾을 수 없습니다.");
    if (place.longitude == null || place.latitude == null) {
      return { status: "unavailable", reason: "coordinates_missing" };
    }
    if (!this.kakao.isConfigured()) {
      return { status: "unavailable", reason: "provider_not_configured" };
    }

    const cached = this.cache.get(placeId);
    if (cached) return cached;

    const longitude = place.longitude.toNumber();
    const latitude = place.latitude.toNumber();
    const slots = await Promise.all(
      COURSE_PLAN.map((slot) =>
        this.searchSlot(slot, longitude, latitude, place.title),
      ),
    );

    const anchor: GeneratedCourseStop = {
      role: "anchor",
      sequence: 1,
      placeId: place.id,
      title: place.title,
      categoryLabel: null,
      address: address(place.address1, place.address2),
      longitude,
      latitude,
      distanceMeters: 0,
      placeUrl: null,
    };
    const stops: GeneratedCourseStop[] = [anchor];
    let sequence = 2;
    for (const [index, slot] of slots.entries()) {
      if (slot.candidate == null) continue;
      const candidate = slot.candidate;
      stops.push({
        role: COURSE_PLAN[index].role,
        sequence: sequence++,
        placeId: null,
        title: candidate.placeName,
        categoryLabel: candidate.categoryName,
        address: candidate.addressName,
        longitude: candidate.longitude,
        latitude: candidate.latitude,
        distanceMeters: candidate.distanceMeters,
        placeUrl: candidate.placeUrl,
      });
    }

    if (stops.length === 1) {
      return { status: "unavailable", reason: "provider_unavailable" };
    }

    const response: GeneratedCourseResponse = {
      status: "ready",
      partial: slots.some((slot) => slot.candidate == null),
      stops,
    };
    this.cache.set(placeId, response);
    return response;
  }

  private async searchSlot(
    slot: CourseSlot,
    longitude: number,
    latitude: number,
    anchorTitle: string,
  ): Promise<SlotResult> {
    const results = await Promise.allSettled(
      slot.codes.map((categoryCode) =>
        this.kakao.searchCategory({
          categoryCode,
          longitude,
          latitude,
          size: GENERATED_COURSE_CANDIDATE_SIZE,
        }),
      ),
    );
    const candidate =
      results
        .flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        )
        .filter((item) => !isAnchorItself(item, anchorTitle))
        .sort(
          (left, right) =>
            (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
            (right.distanceMeters ?? Number.MAX_SAFE_INTEGER),
        )[0] ?? null;
    return { candidate };
  }
}
