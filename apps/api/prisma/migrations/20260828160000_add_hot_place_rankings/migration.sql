CREATE TABLE "hot_place_rankings" (
    "id" UUID NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "scope" VARCHAR(32) NOT NULL,
    "base_year_month" VARCHAR(6) NOT NULL,
    "province_name" VARCHAR(100) NOT NULL,
    "district_name" VARCHAR(100) NOT NULL,
    "source_place_id" VARCHAR(64) NOT NULL,
    "source_place_name" VARCHAR(500) NOT NULL,
    "source_category" VARCHAR(100) NOT NULL,
    "audience" VARCHAR(32) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "rank" INTEGER NOT NULL,
    "growth_percent" DECIMAL(7,2) NOT NULL,
    "place_id" UUID,
    "source_file_name" VARCHAR(500) NOT NULL,
    "imported_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hot_place_rankings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hot_place_rankings_snapshot_rank_key"
ON "hot_place_rankings"("source", "scope", "period_start", "period_end", "audience", "rank");

CREATE UNIQUE INDEX "hot_place_rankings_snapshot_source_place_id_key"
ON "hot_place_rankings"("source", "scope", "period_start", "period_end", "audience", "source_place_id");

CREATE INDEX "hot_place_rankings_source_scope_audience_period_end_rank_idx"
ON "hot_place_rankings"("source", "scope", "audience", "period_end", "rank");

CREATE INDEX "hot_place_rankings_place_id_idx"
ON "hot_place_rankings"("place_id");

ALTER TABLE "hot_place_rankings"
ADD CONSTRAINT "hot_place_rankings_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "hot_place_rankings" IS '한국관광 데이터랩 공식 다운로드에서 적재한 기간·대상별 핫플레이스(방문 급상승) 순위';
COMMENT ON COLUMN "hot_place_rankings"."id" IS 'Haetteum 내부 순위 레코드 식별자';
COMMENT ON COLUMN "hot_place_rankings"."source" IS '순위 원본 provider 식별자';
COMMENT ON COLUMN "hot_place_rankings"."scope" IS '전국 등 순위 집계 범위';
COMMENT ON COLUMN "hot_place_rankings"."base_year_month" IS '데이터랩 기준년월 (YYYYMM)';
COMMENT ON COLUMN "hot_place_rankings"."province_name" IS '데이터랩 시도명';
COMMENT ON COLUMN "hot_place_rankings"."district_name" IS '데이터랩 시군구명';
COMMENT ON COLUMN "hot_place_rankings"."source_place_id" IS '데이터랩 관광지 식별자';
COMMENT ON COLUMN "hot_place_rankings"."source_place_name" IS '데이터랩 관광지명';
COMMENT ON COLUMN "hot_place_rankings"."source_category" IS '데이터랩 관광지 구분';
COMMENT ON COLUMN "hot_place_rankings"."audience" IS '전체 또는 세대별 집계 대상';
COMMENT ON COLUMN "hot_place_rankings"."period_start" IS '순위 집계 시작일';
COMMENT ON COLUMN "hot_place_rankings"."period_end" IS '순위 집계 종료일';
COMMENT ON COLUMN "hot_place_rankings"."rank" IS '집계 범위 안의 원본 순위';
COMMENT ON COLUMN "hot_place_rankings"."growth_percent" IS '데이터랩 원본 성장율의 퍼센트 값';
COMMENT ON COLUMN "hot_place_rankings"."place_id" IS '매칭된 Haetteum 관광지 식별자';
COMMENT ON COLUMN "hot_place_rankings"."source_file_name" IS '감사 가능한 원본 CSV 파일명';
COMMENT ON COLUMN "hot_place_rankings"."imported_at" IS '순위 스냅샷 적재 시각';
COMMENT ON COLUMN "hot_place_rankings"."created_at" IS '내부 레코드 생성 시각';
COMMENT ON COLUMN "hot_place_rankings"."updated_at" IS '내부 레코드 최종 수정 시각';
