ALTER TABLE "festivals"
ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN "festivals"."is_visible" IS 'provider가 콘텐츠를 계속 제공하는지 여부(비표출 전환 시 false)';

CREATE INDEX "festivals_is_visible_event_start_date_idx" ON "festivals"("is_visible", "event_start_date");
