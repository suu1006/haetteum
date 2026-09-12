CREATE TABLE "tour_api_daily_usage" (
  "day" DATE PRIMARY KEY,
  "calls" INTEGER NOT NULL CHECK ("calls" >= 0),
  "last_started_at" TIMESTAMPTZ(3) NOT NULL
);

ALTER TABLE "places" ADD COLUMN "detail_source_modified_at" TIMESTAMPTZ(3);
ALTER TABLE "tourism_sync_runs" ADD COLUMN "checkpoint_at" TIMESTAMPTZ(3);

ALTER TABLE "festivals" ADD COLUMN "detail_snapshot" JSONB, ADD COLUMN "detail_source_modified_at" TIMESTAMPTZ(3), ADD COLUMN "detail_synced_at" TIMESTAMPTZ(3);

COMMENT ON COLUMN "places"."detail_source_modified_at" IS '상세 수집을 완료한 원본 수정 시각';
COMMENT ON COLUMN "tourism_sync_runs"."checkpoint_at" IS '성공한 목록 수집의 시작 기준 시각';
COMMENT ON COLUMN "festivals"."detail_snapshot" IS '배치에서 검증한 축제 상세 및 이미지 스냅샷';
COMMENT ON COLUMN "festivals"."detail_source_modified_at" IS '상세 수집을 완료한 원본 수정 시각';
COMMENT ON COLUMN "festivals"."detail_synced_at" IS '축제 상세정보를 마지막으로 정상 반영한 시각';
COMMENT ON TABLE "tour_api_daily_usage" IS 'TourAPI 요청 시도 일일 예산';
COMMENT ON COLUMN "tour_api_daily_usage"."day" IS 'KST 기준 호출 집계일';
COMMENT ON COLUMN "tour_api_daily_usage"."calls" IS '재시도를 포함한 HTTP 요청 시도 수';
COMMENT ON COLUMN "tour_api_daily_usage"."last_started_at" IS '마지막 요청 시작 시각';
