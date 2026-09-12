import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module.js";
import type { Prisma } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const EXPECTED_REGIONS = [
  { slug: "seoul", name: "서울", providerCode: "11", displayOrder: 1 },
  { slug: "gyeonggi", name: "경기", providerCode: "41", displayOrder: 2 },
  { slug: "gangwon", name: "강원", providerCode: "51", displayOrder: 3 },
  { slug: "busan", name: "부산", providerCode: "26", displayOrder: 4 },
  { slug: "jeju", name: "제주", providerCode: "50", displayOrder: 5 },
  { slug: "daegu", name: "대구", providerCode: "27", displayOrder: 6 },
  { slug: "incheon", name: "인천", providerCode: "28", displayOrder: 7 },
  { slug: "gwangju", name: "광주", providerCode: "29", displayOrder: 8 },
  { slug: "daejeon", name: "대전", providerCode: "30", displayOrder: 9 },
  { slug: "ulsan", name: "울산", providerCode: "31", displayOrder: 10 },
  { slug: "sejong", name: "세종", providerCode: "36", displayOrder: 11 },
  { slug: "chungbuk", name: "충북", providerCode: "43", displayOrder: 12 },
  { slug: "chungnam", name: "충남", providerCode: "44", displayOrder: 13 },
  { slug: "jeonbuk", name: "전북", providerCode: "52", displayOrder: 14 },
  { slug: "jeonnam", name: "전남", providerCode: "46", displayOrder: 15 },
  { slug: "gyeongbuk", name: "경북", providerCode: "47", displayOrder: 16 },
  { slug: "gyeongnam", name: "경남", providerCode: "48", displayOrder: 17 },
] as const;

const EXPECTED_DATABASE_COMMENTS = {
  tourism_regions: {
    table: "Haetteum 서비스에서 노출하는 광역 관광 지역",
    columns: {
      id: "Haetteum 내부 관광 지역 식별자",
      slug: "웹과 API에서 사용하는 안정적인 영문 지역 식별자",
      name: "사용자에게 표시하는 지역명",
      provider_code: "TourAPI 법정동 시도 코드",
      display_order: "메인 화면 지역 필터 표시 순서",
      is_active: "서비스에서 지역을 노출할지 여부",
      created_at: "내부 레코드 생성 시각",
      updated_at: "내부 레코드 최종 수정 시각",
    },
  },
  tourism_districts: {
    table: "TourAPI 법정동 시군구 코드와 광역 관광 지역의 관계",
    columns: {
      id: "Haetteum 내부 시군구 식별자",
      region_id: "소속 광역 관광 지역 식별자",
      provider_code: "TourAPI 법정동 시군구 코드",
      name: "사용자에게 표시하는 시군구명",
      is_active: "서비스에서 시군구를 사용할지 여부",
      created_at: "내부 레코드 생성 시각",
      updated_at: "내부 레코드 최종 수정 시각",
    },
  },
  places: {
    table: "TourAPI에서 동기화한 관광지 기본 정보",
    columns: {
      id: "Haetteum 내부 관광지 식별자",
      source: "관광지 원본 provider 식별자",
      external_id: "provider가 부여한 관광지 식별자",
      content_type_id: "TourAPI 콘텐츠 타입 ID",
      region_id: "소속 광역 관광 지역 식별자",
      district_id: "소속 시군구 식별자이며 제공되지 않으면 NULL",
      title: "관광지명",
      address1: "기본 주소",
      address2: "상세 주소",
      zipcode: "우편번호",
      longitude: "WGS84 경도",
      latitude: "WGS84 위도",
      map_level: "TourAPI 지도 확대 레벨",
      category1: "TourAPI 신분류 대분류 코드",
      category2: "TourAPI 신분류 중분류 코드",
      category3: "TourAPI 신분류 소분류 코드",
      telephone: "관광지 안내 전화번호",
      homepage: "관광지 홈페이지 주소",
      overview: "관광지 소개 설명",
      info_center: "관광지 안내센터 정보",
      rest_date: "관광지 휴무일 안내",
      use_season: "관광지 이용 가능 계절",
      use_time: "관광지 이용 시간",
      parking: "관광지 주차 안내",
      experience_age_range: "관광지 체험 가능 연령",
      experience_guide: "관광지 체험 안내",
      baby_carriage: "유모차 대여 가능 여부",
      credit_card: "신용카드 사용 가능 여부",
      pet: "반려동물 동반 가능 여부",
      detail_synced_at: "TourAPI 상세정보를 마지막으로 정상 반영한 시각",
      detail_source_modified_at: "상세 수집을 완료한 원본 수정 시각",
      reels_synced_at: "관광지 릴스를 YouTube에서 마지막으로 수집 시도한 시각",
      primary_image_url: "대표 원본 이미지 URL",
      primary_thumbnail_url: "대표 썸네일 이미지 URL",
      image_copyright_type: "대표 이미지 공공누리 저작권 유형",
      provider_created_at: "provider 콘텐츠 최초 등록 시각",
      provider_modified_at: "provider 콘텐츠 최종 수정 시각",
      is_visible: "서비스에서 관광지를 노출할지 여부",
      last_synced_at: "내부 DB에 마지막으로 정상 반영한 시각",
      created_at: "내부 레코드 생성 시각",
      updated_at: "내부 레코드 최종 수정 시각",
    },
  },
  place_images: {
    table: "TourAPI에서 동기화한 관광지 상세 이미지",
    columns: {
      id: "Haetteum 내부 관광지 이미지 식별자",
      place_id: "소속 관광지 식별자",
      source: "이미지 원본 provider 식별자",
      serial_number: "provider 이미지 일련번호",
      name: "provider 이미지명",
      original_url: "원본 이미지 URL",
      thumbnail_url: "썸네일 이미지 URL",
      copyright_type: "이미지 공공누리 저작권 유형",
      display_order: "상세 화면 이미지 표시 순서",
      created_at: "내부 레코드 생성 시각",
      updated_at: "내부 레코드 최종 수정 시각",
    },
  },
  place_detail_infos: {
    table: "TourAPI에서 동기화한 관광지 반복 상세정보",
    columns: {
      id: "Haetteum 내부 반복 상세정보 식별자",
      place_id: "소속 관광지 식별자",
      source: "상세정보 원본 provider 식별자",
      serial_number: "provider 상세정보 일련번호",
      field_group: "provider 상세정보 필드 그룹",
      name: "상세정보 이름",
      text: "상세정보 본문",
      display_order: "상세 화면 표시 순서",
      created_at: "내부 레코드 생성 시각",
      updated_at: "내부 레코드 최종 수정 시각",
    },
  },
  place_rankings: {
    table:
      "한국관광 데이터랩 공식 다운로드에서 적재한 기간·대상별 인기관광지 순위",
    columns: {
      id: "Haetteum 내부 순위 레코드 식별자",
      source: "순위 원본 provider 식별자",
      scope: "전국 등 순위 집계 범위",
      source_place_id: "데이터랩 관광지 식별자",
      source_place_name: "데이터랩 관광지명",
      source_category: "데이터랩 관광지 구분",
      audience: "전체 또는 세대별 집계 대상",
      period_start: "순위 집계 시작일",
      period_end: "순위 집계 종료일",
      rank: "집계 범위 안의 원본 순위",
      share_percent: "데이터랩 원본 비율의 퍼센트 값",
      place_id: "매칭된 Haetteum 관광지 식별자",
      primary_image_url:
        "랭킹 노출용 대표 이미지 URL이며 매칭된 관광지 또는 TourAPI 키워드 검색에서 확정",
      image_copyright_type: "대표 이미지 공공누리 저작권 유형",
      image_attribution:
        "TourAPI 밖에서(Wikimedia Commons 등) 가져온 이미지의 저작자 표시 문구",
      image_attribution_url: "imageAttribution 문구가 링크할 출처 페이지 URL",
      source_file_name: "감사 가능한 원본 CSV 파일명",
      imported_at: "순위 스냅샷 적재 시각",
      created_at: "내부 레코드 생성 시각",
      updated_at: "내부 레코드 최종 수정 시각",
    },
  },
  festivals: {
    table: "TourAPI에서 동기화한 축제 기본 정보",
    columns: {
      detail_snapshot: "배치에서 검증한 축제 상세 및 이미지 스냅샷",
      detail_source_modified_at: "상세 수집을 완료한 원본 수정 시각",
      detail_synced_at: "축제 상세정보를 마지막으로 정상 반영한 시각",
      id: "Haetteum 내부 축제 식별자",
      source: "축제 원본 provider 식별자",
      external_id: "provider가 부여한 축제 식별자",
      content_type_id: "TourAPI 콘텐츠 타입 ID",
      title: "축제명",
      event_start_date: "축제 시작일",
      event_end_date: "축제 종료일",
      provider_region_code: "TourAPI 법정동 시도 코드",
      provider_district_code: "TourAPI 법정동 시군구 코드",
      address1: "기본 주소",
      address2: "상세 주소",
      zipcode: "우편번호",
      longitude: "WGS84 경도",
      latitude: "WGS84 위도",
      map_level: "TourAPI 지도 확대 레벨",
      category1: "TourAPI 신분류 대분류 코드",
      category2: "TourAPI 신분류 중분류 코드",
      category3: "TourAPI 신분류 소분류 코드",
      telephone: "축제 안내 전화번호",
      is_visible:
        "provider가 콘텐츠를 계속 제공하는지 여부(비표출 전환 시 false)",
      primary_image_url: "대표 원본 이미지 URL",
      primary_thumbnail_url: "대표 썸네일 이미지 URL",
      image_copyright_type: "대표 이미지 공공누리 저작권 유형",
      provider_created_at: "provider 콘텐츠 최초 등록 시각",
      provider_modified_at: "provider 콘텐츠 최종 수정 시각",
      last_synced_at: "내부 DB에 마지막으로 정상 반영한 시각",
      created_at: "내부 레코드 생성 시각",
      updated_at: "내부 레코드 최종 수정 시각",
    },
  },
  tourism_sync_runs: {
    table: "관광 데이터 전체 또는 증분 동기화 실행 이력",
    columns: {
      id: "동기화 실행 식별자",
      provider: "동기화 대상 관광 데이터 provider",
      job_type: "전체 또는 증분 등 동기화 작업 유형",
      status: "동기화 실행 상태",
      requested_from: "증분 동기화 요청에 사용한 시작 기준 시각",
      checkpoint_at: "성공한 목록 수집의 시작 기준 시각",
      started_at: "동기화 실행 시작 시각",
      finished_at: "동기화 실행 종료 시각",
      fetched_count: "외부 provider에서 조회한 항목 수",
      inserted_count: "새로 저장한 항목 수",
      updated_count: "기존 값을 갱신한 항목 수",
      deactivated_count: "비표출 상태로 전환한 항목 수",
      failed_count: "처리에 실패한 항목 수",
      error_summary: "비밀정보를 제외한 오류 요약",
    },
  },
} as const;

type DatabaseCommentRow = {
  tableName: string;
  tableComment: string | null;
  columnName: string;
  columnComment: string | null;
};

type DatabaseIndexRow = {
  indexName: string;
  isUnique: boolean;
  columnNames: string;
};

type DatabaseForeignKeyRow = {
  constraintName: string;
  deleteAction: string;
  updateAction: string;
};

describe("tourism database foundation (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testRegionIds = new Set<string>();
  const testPlaceRankingIds = new Set<string>();
  const testSyncRunIds = new Set<string>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    const syncRunIds = [...testSyncRunIds];
    if (syncRunIds.length > 0) {
      await prisma.tourismSyncRun.deleteMany({
        where: { id: { in: syncRunIds } },
      });
      testSyncRunIds.clear();
    }

    const ids = [...testRegionIds];
    const rankingIds = [...testPlaceRankingIds];
    if (rankingIds.length > 0) {
      await prisma.placeRanking.deleteMany({
        where: { id: { in: rankingIds } },
      });
      testPlaceRankingIds.clear();
    }

    if (ids.length === 0) return;

    await prisma.placeRanking.deleteMany({
      where: { place: { regionId: { in: ids } } },
    });
    await prisma.place.deleteMany({ where: { regionId: { in: ids } } });
    await prisma.tourismDistrict.deleteMany({
      where: { regionId: { in: ids } },
    });
    await prisma.tourismRegion.deleteMany({ where: { id: { in: ids } } });
    testRegionIds.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTestRegion() {
    const suffix = randomUUID().replaceAll("-", "");
    const region = await prisma.tourismRegion.create({
      data: {
        slug: `test-${suffix.slice(0, 20)}`,
        name: "테스트 지역",
        providerCode: `t${suffix.slice(0, 9)}`,
        displayOrder: 999,
      },
    });
    testRegionIds.add(region.id);
    return region;
  }

  function placeData(regionId: string, externalId: string) {
    const now = new Date();
    return {
      source: "TOUR_API",
      externalId,
      contentTypeId: 12,
      regionId,
      title: "테스트 관광지",
      providerModifiedAt: now,
      lastSyncedAt: now,
    };
  }

  function placeRankingData(
    overrides: Partial<Prisma.PlaceRankingUncheckedCreateInput> = {},
  ): Prisma.PlaceRankingUncheckedCreateInput {
    const suffix = randomUUID().replaceAll("-", "");
    return {
      source: "KTO_DATALAB",
      scope: `TEST_${suffix.slice(0, 12)}`,
      sourcePlaceId: suffix,
      sourcePlaceName: "에버랜드",
      sourceCategory: "레저/스포츠",
      audience: "ALL",
      periodStart: new Date("2025-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
      rank: 1,
      sharePercent: "9.0",
      placeId: null,
      sourceFileName: "세대별 인기관광지(전체).csv",
      importedAt: new Date("2026-08-25T07:45:20.000Z"),
      ...overrides,
    };
  }

  it("contains all 17 active regions for nationwide ingestion", async () => {
    const regions = await prisma.tourismRegion.findMany({
      where: {
        slug: { in: EXPECTED_REGIONS.map((region) => region.slug) },
        isActive: true,
      },
      orderBy: { displayOrder: "asc" },
      select: {
        slug: true,
        name: true,
        providerCode: true,
        displayOrder: true,
      },
    });

    expect(regions).toEqual(EXPECTED_REGIONS);
  });

  it("documents every tourism table and column in PostgreSQL", async () => {
    const rows = await prisma.$queryRaw<DatabaseCommentRow[]>`
      SELECT
        tables.relname AS "tableName",
        obj_description(tables.oid, 'pg_class') AS "tableComment",
        columns.attname AS "columnName",
        col_description(tables.oid, columns.attnum) AS "columnComment"
      FROM pg_catalog.pg_class AS tables
      INNER JOIN pg_catalog.pg_namespace AS namespaces
        ON namespaces.oid = tables.relnamespace
      INNER JOIN pg_catalog.pg_attribute AS columns
        ON columns.attrelid = tables.oid
      WHERE namespaces.nspname = 'public'
        AND tables.relkind = 'r'
        AND tables.relname IN (
          'tourism_regions',
          'tourism_districts',
          'places',
          'place_images',
          'place_detail_infos',
          'place_rankings',
          'festivals',
          'tourism_sync_runs'
        )
        AND columns.attnum > 0
        AND NOT columns.attisdropped
      ORDER BY tables.relname, columns.attnum
    `;

    for (const [tableName, expected] of Object.entries(
      EXPECTED_DATABASE_COMMENTS,
    )) {
      const tableRows = rows.filter((row) => row.tableName === tableName);
      const actualColumns = Object.fromEntries(
        tableRows.map((row) => [row.columnName, row.columnComment]),
      );

      expect(tableRows).not.toHaveLength(0);
      expect(tableRows[0]?.tableComment).toBe(expected.table);
      expect(actualColumns).toEqual(expected.columns);
    }
  });

  it("creates the place ranking unique and latest-read indexes", async () => {
    const rows = await prisma.$queryRaw<DatabaseIndexRow[]>`
      SELECT
        indexes.relname::text AS "indexName",
        pg_indexes.indisunique AS "isUnique",
        array_to_string(
          array_agg(columns.attname::text ORDER BY index_columns.ordinality),
          ','
        ) AS "columnNames"
      FROM pg_catalog.pg_class AS tables
      INNER JOIN pg_catalog.pg_namespace AS namespaces
        ON namespaces.oid = tables.relnamespace
      INNER JOIN pg_catalog.pg_index AS pg_indexes
        ON pg_indexes.indrelid = tables.oid
      INNER JOIN pg_catalog.pg_class AS indexes
        ON indexes.oid = pg_indexes.indexrelid
      INNER JOIN LATERAL unnest(pg_indexes.indkey) WITH ORDINALITY AS index_columns(attnum, ordinality)
        ON TRUE
      INNER JOIN pg_catalog.pg_attribute AS columns
        ON columns.attrelid = tables.oid
       AND columns.attnum = index_columns.attnum
      WHERE namespaces.nspname = 'public'
        AND tables.relname = 'place_rankings'
        AND indexes.relname IN (
          'place_rankings_snapshot_rank_key',
          'place_rankings_snapshot_source_place_id_key',
          'place_rankings_source_scope_audience_period_end_rank_idx',
          'place_rankings_place_id_idx'
        )
      GROUP BY indexes.relname, pg_indexes.indisunique
    `;

    const indexes = Object.fromEntries(
      rows.map((row) => [
        row.indexName,
        { isUnique: row.isUnique, columnNames: row.columnNames.split(",") },
      ]),
    );

    expect(indexes).toEqual({
      place_rankings_snapshot_rank_key: {
        isUnique: true,
        columnNames: [
          "source",
          "scope",
          "period_start",
          "period_end",
          "audience",
          "rank",
        ],
      },
      place_rankings_snapshot_source_place_id_key: {
        isUnique: true,
        columnNames: [
          "source",
          "scope",
          "period_start",
          "period_end",
          "audience",
          "source_place_id",
        ],
      },
      place_rankings_source_scope_audience_period_end_rank_idx: {
        isUnique: false,
        columnNames: ["source", "scope", "audience", "period_end", "rank"],
      },
      place_rankings_place_id_idx: {
        isUnique: false,
        columnNames: ["place_id"],
      },
    });
  });

  it("keeps the place ranking foreign key set-null action", async () => {
    const rows = await prisma.$queryRaw<DatabaseForeignKeyRow[]>`
      SELECT
        constraints.conname::text AS "constraintName",
        constraints.confdeltype::text AS "deleteAction",
        constraints.confupdtype::text AS "updateAction"
      FROM pg_catalog.pg_constraint AS constraints
      INNER JOIN pg_catalog.pg_class AS tables
        ON tables.oid = constraints.conrelid
      INNER JOIN pg_catalog.pg_namespace AS namespaces
        ON namespaces.oid = tables.relnamespace
      WHERE namespaces.nspname = 'public'
        AND tables.relname = 'place_rankings'
        AND constraints.conname = 'place_rankings_place_id_fkey'
        AND constraints.contype = 'f'
    `;

    expect(rows).toEqual([
      {
        constraintName: "place_rankings_place_id_fkey",
        deleteAction: "n",
        updateAction: "c",
      },
    ]);
  });

  it("stores a place ranking without a linked place", async () => {
    const ranking = await prisma.placeRanking.create({
      data: placeRankingData(),
    });
    testPlaceRankingIds.add(ranking.id);

    expect(ranking.placeId).toBeNull();
    expect(ranking.rank).toBe(1);
  });

  it("rejects duplicate place ranking snapshot ranks and source place identities", async () => {
    const base = placeRankingData();
    const first = await prisma.placeRanking.create({ data: base });
    testPlaceRankingIds.add(first.id);

    await expect(
      prisma.placeRanking.create({
        data: {
          ...base,
          sourcePlaceId: `${base.sourcePlaceId}-rank`,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    await expect(
      prisma.placeRanking.create({
        data: {
          ...base,
          rank: 2,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("sets a linked place ranking placeId to null when the place is removed", async () => {
    const region = await createTestRegion();
    const place = await prisma.place.create({
      data: placeData(region.id, randomUUID()),
    });
    const ranking = await prisma.placeRanking.create({
      data: placeRankingData({ placeId: place.id }),
    });
    testPlaceRankingIds.add(ranking.id);

    await prisma.place.delete({ where: { id: place.id } });
    const updated = await prisma.placeRanking.findUniqueOrThrow({
      where: { id: ranking.id },
    });

    expect(updated.placeId).toBeNull();
  });

  it("stores a place without a district and preserves its UUID when hidden", async () => {
    const region = await createTestRegion();
    const created = await prisma.place.create({
      data: placeData(region.id, randomUUID()),
    });
    const hidden = await prisma.place.update({
      where: { id: created.id },
      data: { isVisible: false },
    });

    expect(created.districtId).toBeNull();
    expect(hidden.id).toBe(created.id);
    expect(hidden.isVisible).toBe(false);
  });

  it("rejects duplicate provider identities", async () => {
    const region = await createTestRegion();
    const externalId = randomUUID();
    await prisma.place.create({ data: placeData(region.id, externalId) });

    await expect(
      prisma.place.create({ data: placeData(region.id, externalId) }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects deleting a region that still owns a place", async () => {
    const region = await createTestRegion();
    await prisma.place.create({
      data: placeData(region.id, randomUUID()),
    });

    await expect(
      prisma.tourismRegion.delete({ where: { id: region.id } }),
    ).rejects.toBeDefined();
    const preserved = await prisma.tourismRegion.findUnique({
      where: { id: region.id },
    });

    expect(preserved?.id).toBe(region.id);
  });

  it("sets a place district to null when that district is removed", async () => {
    const region = await createTestRegion();
    const district = await prisma.tourismDistrict.create({
      data: {
        regionId: region.id,
        providerCode: `d${randomUUID().replaceAll("-", "").slice(0, 9)}`,
        name: "테스트 시군구",
      },
    });
    const place = await prisma.place.create({
      data: {
        ...placeData(region.id, randomUUID()),
        districtId: district.id,
      },
    });

    await prisma.tourismDistrict.delete({ where: { id: district.id } });
    const updated = await prisma.place.findUniqueOrThrow({
      where: { id: place.id },
    });

    expect(updated.districtId).toBeNull();
  });

  it("stores a successful sync run with zeroed counters", async () => {
    const finishedAt = new Date();
    const run = await prisma.tourismSyncRun.create({
      data: {
        provider: "TOUR_API",
        jobType: "FULL",
        status: "SUCCEEDED",
        finishedAt,
      },
    });
    testSyncRunIds.add(run.id);

    expect(run).toMatchObject({
      provider: "TOUR_API",
      jobType: "FULL",
      status: "SUCCEEDED",
      requestedFrom: null,
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      deactivatedCount: 0,
      failedCount: 0,
    });
    expect(run.finishedAt).toEqual(finishedAt);
  });
});
