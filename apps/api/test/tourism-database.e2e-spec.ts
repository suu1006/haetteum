import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const EXPECTED_REGIONS = [
  { slug: "seoul", name: "서울", providerCode: "11", displayOrder: 1 },
  { slug: "gyeonggi", name: "경기", providerCode: "41", displayOrder: 2 },
  { slug: "gangwon", name: "강원", providerCode: "51", displayOrder: 3 },
  { slug: "busan", name: "부산", providerCode: "26", displayOrder: 4 },
  { slug: "jeju", name: "제주", providerCode: "50", displayOrder: 5 },
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
  festivals: {
    table: "TourAPI에서 동기화한 축제 기본 정보",
    columns: {
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

describe("tourism database foundation (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testRegionIds = new Set<string>();
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
    if (ids.length === 0) return;

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

  it("contains the five approved product regions", async () => {
    const regions = await prisma.tourismRegion.findMany({
      where: { slug: { in: EXPECTED_REGIONS.map((region) => region.slug) } },
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
