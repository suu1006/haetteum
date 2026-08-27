ALTER TABLE "places"
ADD COLUMN "info_center" TEXT,
ADD COLUMN "rest_date" TEXT,
ADD COLUMN "use_season" TEXT,
ADD COLUMN "use_time" TEXT,
ADD COLUMN "parking" TEXT,
ADD COLUMN "experience_age_range" TEXT,
ADD COLUMN "experience_guide" TEXT,
ADD COLUMN "baby_carriage" TEXT,
ADD COLUMN "credit_card" TEXT,
ADD COLUMN "pet" TEXT,
ADD COLUMN "detail_synced_at" TIMESTAMPTZ(3);

CREATE TABLE "place_images" (
    "id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "serial_number" VARCHAR(64) NOT NULL,
    "name" VARCHAR(500),
    "original_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "copyright_type" VARCHAR(20),
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "place_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "place_detail_infos" (
    "id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "serial_number" VARCHAR(64) NOT NULL,
    "field_group" VARCHAR(32),
    "name" VARCHAR(500) NOT NULL,
    "text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "place_detail_infos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "place_images_place_id_source_serial_number_key"
ON "place_images"("place_id", "source", "serial_number");
CREATE INDEX "place_images_place_id_display_order_idx"
ON "place_images"("place_id", "display_order");
CREATE UNIQUE INDEX "place_detail_infos_place_id_source_serial_number_key"
ON "place_detail_infos"("place_id", "source", "serial_number");
CREATE INDEX "place_detail_infos_place_id_display_order_idx"
ON "place_detail_infos"("place_id", "display_order");

ALTER TABLE "place_images"
ADD CONSTRAINT "place_images_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "place_detail_infos"
ADD CONSTRAINT "place_detail_infos_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON COLUMN "places"."info_center" IS '관광지 안내센터 정보';
COMMENT ON COLUMN "places"."rest_date" IS '관광지 휴무일 안내';
COMMENT ON COLUMN "places"."use_season" IS '관광지 이용 가능 계절';
COMMENT ON COLUMN "places"."use_time" IS '관광지 이용 시간';
COMMENT ON COLUMN "places"."parking" IS '관광지 주차 안내';
COMMENT ON COLUMN "places"."experience_age_range" IS '관광지 체험 가능 연령';
COMMENT ON COLUMN "places"."experience_guide" IS '관광지 체험 안내';
COMMENT ON COLUMN "places"."baby_carriage" IS '유모차 대여 가능 여부';
COMMENT ON COLUMN "places"."credit_card" IS '신용카드 사용 가능 여부';
COMMENT ON COLUMN "places"."pet" IS '반려동물 동반 가능 여부';
COMMENT ON COLUMN "places"."detail_synced_at" IS 'TourAPI 상세정보를 마지막으로 정상 반영한 시각';

COMMENT ON TABLE "place_images" IS 'TourAPI에서 동기화한 관광지 상세 이미지';
COMMENT ON COLUMN "place_images"."id" IS 'Haetteum 내부 관광지 이미지 식별자';
COMMENT ON COLUMN "place_images"."place_id" IS '소속 관광지 식별자';
COMMENT ON COLUMN "place_images"."source" IS '이미지 원본 provider 식별자';
COMMENT ON COLUMN "place_images"."serial_number" IS 'provider 이미지 일련번호';
COMMENT ON COLUMN "place_images"."name" IS 'provider 이미지명';
COMMENT ON COLUMN "place_images"."original_url" IS '원본 이미지 URL';
COMMENT ON COLUMN "place_images"."thumbnail_url" IS '썸네일 이미지 URL';
COMMENT ON COLUMN "place_images"."copyright_type" IS '이미지 공공누리 저작권 유형';
COMMENT ON COLUMN "place_images"."display_order" IS '상세 화면 이미지 표시 순서';
COMMENT ON COLUMN "place_images"."created_at" IS '내부 레코드 생성 시각';
COMMENT ON COLUMN "place_images"."updated_at" IS '내부 레코드 최종 수정 시각';

COMMENT ON TABLE "place_detail_infos" IS 'TourAPI에서 동기화한 관광지 반복 상세정보';
COMMENT ON COLUMN "place_detail_infos"."id" IS 'Haetteum 내부 반복 상세정보 식별자';
COMMENT ON COLUMN "place_detail_infos"."place_id" IS '소속 관광지 식별자';
COMMENT ON COLUMN "place_detail_infos"."source" IS '상세정보 원본 provider 식별자';
COMMENT ON COLUMN "place_detail_infos"."serial_number" IS 'provider 상세정보 일련번호';
COMMENT ON COLUMN "place_detail_infos"."field_group" IS 'provider 상세정보 필드 그룹';
COMMENT ON COLUMN "place_detail_infos"."name" IS '상세정보 이름';
COMMENT ON COLUMN "place_detail_infos"."text" IS '상세정보 본문';
COMMENT ON COLUMN "place_detail_infos"."display_order" IS '상세 화면 표시 순서';
COMMENT ON COLUMN "place_detail_infos"."created_at" IS '내부 레코드 생성 시각';
COMMENT ON COLUMN "place_detail_infos"."updated_at" IS '내부 레코드 최종 수정 시각';
