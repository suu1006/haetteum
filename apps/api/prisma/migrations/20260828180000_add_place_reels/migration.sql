ALTER TABLE "places"
ADD COLUMN "reels_synced_at" TIMESTAMPTZ(3);

COMMENT ON COLUMN "places"."reels_synced_at" IS '관광지 릴스를 YouTube에서 마지막으로 수집 시도한 시각';

CREATE TABLE "place_reels" (
    "id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_video_id" VARCHAR(32) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "channel_title" VARCHAR(255) NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "view_count" BIGINT,
    "published_at" TIMESTAMPTZ(3) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "place_reels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "place_reels_place_id_display_order_idx"
ON "place_reels"("place_id", "display_order");

CREATE UNIQUE INDEX "place_reels_place_id_provider_provider_video_id_key"
ON "place_reels"("place_id", "provider", "provider_video_id");

ALTER TABLE "place_reels"
ADD CONSTRAINT "place_reels_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "place_reels" IS 'YouTube Data API에서 수집한 관광지 릴스(세로 숏폼) 캐시';
COMMENT ON COLUMN "place_reels"."id" IS 'Haetteum 내부 릴스 식별자';
COMMENT ON COLUMN "place_reels"."place_id" IS '소속 관광지 식별자';
COMMENT ON COLUMN "place_reels"."provider" IS '릴스 원본 provider 식별자';
COMMENT ON COLUMN "place_reels"."provider_video_id" IS 'provider가 부여한 영상 식별자';
COMMENT ON COLUMN "place_reels"."title" IS '영상 제목';
COMMENT ON COLUMN "place_reels"."channel_title" IS '업로드 채널명';
COMMENT ON COLUMN "place_reels"."thumbnail_url" IS '세로 썸네일 이미지 URL';
COMMENT ON COLUMN "place_reels"."duration_seconds" IS '영상 길이(초)';
COMMENT ON COLUMN "place_reels"."view_count" IS '조회수이며 제공되지 않으면 NULL';
COMMENT ON COLUMN "place_reels"."published_at" IS '영상 공개 시각';
COMMENT ON COLUMN "place_reels"."display_order" IS '릴스 목록 표시 순서';
COMMENT ON COLUMN "place_reels"."fetched_at" IS '릴스를 provider에서 마지막으로 정상 조회한 시각';
COMMENT ON COLUMN "place_reels"."created_at" IS '내부 레코드 생성 시각';
COMMENT ON COLUMN "place_reels"."updated_at" IS '내부 레코드 최종 수정 시각';
