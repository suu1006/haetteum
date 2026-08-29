import { Inject, Injectable, Logger, Optional } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import {
  buildSearchKeywords,
  pickRelevantCandidate,
} from "./place-name-matching.js";
import { mapSearchedPlace } from "./tour-api.mapper.js";
import type { TourApiPlace, TourApiPort } from "./tour-api.types.js";
import {
  TOUR_API_PORT,
  TOUR_API_SOURCE,
  TOURISM_SEARCH_AREA_CODES,
} from "./tourism.constants.js";

export interface RankingPlaceLinkPrisma {
  tourismRegion: {
    findFirst(args: {
      where: { providerCode: string; isActive: true };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  tourismDistrict: {
    findFirst(args: {
      where: { regionId: string; providerCode: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  place: {
    findFirst(args: {
      where: { source: string; externalId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: { data: PlaceCreateInput }): Promise<{ id: string }>;
  };
}

type PlaceCreateInput = ReturnType<typeof mapSearchedPlace> & {
  regionId: string;
  districtId: string | null;
};

export type RankingPlaceLinkInput = {
  placeName: string;
  areaCode?: string;
};

export interface RankingPlaceLinker {
  resolvePlaceId(input: RankingPlaceLinkInput): Promise<string | null>;
}

/**
 * 데이터랩 랭킹 명칭을 TourAPI 키워드 검색으로 해석해 관광지 레코드와 연결한다.
 * 지역 기반 동기화는 5개 시도의 관광지(콘텐츠 타입 12)만 적재하므로, 랭킹 상위에
 * 자주 등장하는 문화시설·레포츠 등은 그대로 두면 상세 화면으로 갈 수 없다.
 * 검색으로 찾은 콘텐츠를 같은 `TOUR_API` 소스 규약으로 저장해 상세 화면을 열어 준다.
 */
@Injectable()
export class RankingPlaceLinkService implements RankingPlaceLinker {
  private readonly logger = new Logger(RankingPlaceLinkService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: RankingPlaceLinkPrisma,
    @Optional()
    @Inject(TOUR_API_PORT)
    private readonly tourApi: TourApiPort | null = null,
  ) {}

  /**
   * 랭킹 행과 연결할 관광지 식별자를 돌려준다.
   * 이미 저장된 콘텐츠면 그대로 재사용하고, 없으면 검색 결과로 새로 만든다.
   * 관련 있어 보이는 후보가 없거나 서비스 지역 밖이면 null — 틀린 장소로 보내는
   * 것보다 링크 없이 두는 쪽을 택한다.
   */
  async resolvePlaceId(input: RankingPlaceLinkInput): Promise<string | null> {
    const candidate = await this.searchCandidate(input);
    if (candidate === null) return null;

    try {
      return await this.savePlace(candidate);
    } catch (error) {
      this.logger.warn(
        `Failed to link ranking place "${input.placeName}": ${String(error)}`,
      );
      return null;
    }
  }

  /**
   * 데이터랩이 시도명을 주면 그 지역만, 주지 않으면 서비스 지역을 차례로 훑는다.
   * 지역을 좁히지 않은 전국 검색은 동명의 브랜드 매장이 앞을 채워 정작 찾는 장소가
   * 결과에 들어오지 못한다. 대표 이미지 선정과 달리 이미지 없는 후보도 받아들인다 —
   * 사진이 없다고 상세 화면까지 막을 이유는 없다.
   */
  private async searchCandidate(
    input: RankingPlaceLinkInput,
  ): Promise<TourApiPlace | null> {
    if (this.tourApi === null) return null;

    const areaCodes =
      input.areaCode === undefined
        ? [...TOURISM_SEARCH_AREA_CODES]
        : [input.areaCode];

    try {
      for (const keyword of buildSearchKeywords(input.placeName)) {
        for (const areaCode of areaCodes) {
          const candidates = await this.tourApi.searchPlaceCandidates({
            keyword,
            areaCode,
          });
          const match = pickRelevantCandidate(candidates, keyword, {
            requireImage: false,
            requireExactTitle: true,
          });

          if (match !== null) return match;
        }
      }
    } catch (error) {
      this.logger.warn(
        `TourAPI keyword search failed for "${input.placeName}": ${String(error)}`,
      );
    }

    return null;
  }

  private async savePlace(candidate: TourApiPlace): Promise<string | null> {
    const existing = await this.prisma.place.findFirst({
      where: { source: TOUR_API_SOURCE, externalId: candidate.contentid },
      select: { id: true },
    });
    if (existing !== null) return existing.id;

    const place = mapSearchedPlace(candidate, new Date());
    const region = await this.prisma.tourismRegion.findFirst({
      where: { providerCode: candidate.lDongRegnCd, isActive: true },
      select: { id: true },
    });
    if (region === null) return null;

    const districtCode = candidate.lDongSignguCd?.trim();
    const district =
      districtCode == null || districtCode === ""
        ? null
        : await this.prisma.tourismDistrict.findFirst({
            where: { regionId: region.id, providerCode: districtCode },
            select: { id: true },
          });

    const created = await this.prisma.place.create({
      data: { ...place, regionId: region.id, districtId: district?.id ?? null },
    });

    return created.id;
  }
}
