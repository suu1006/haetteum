CREATE TABLE "festivals" (
    "id" UUID NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "external_id" VARCHAR(64) NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "event_start_date" DATE NOT NULL,
    "event_end_date" DATE NOT NULL,
    "provider_region_code" VARCHAR(10),
    "provider_district_code" VARCHAR(10),
    "address1" VARCHAR(500),
    "address2" VARCHAR(500),
    "zipcode" VARCHAR(20),
    "longitude" DECIMAL(10,7),
    "latitude" DECIMAL(10,7),
    "map_level" INTEGER,
    "category1" VARCHAR(20),
    "category2" VARCHAR(20),
    "category3" VARCHAR(20),
    "telephone" VARCHAR(100),
    "primary_image_url" TEXT,
    "primary_thumbnail_url" TEXT,
    "image_copyright_type" VARCHAR(20),
    "provider_created_at" TIMESTAMPTZ(3),
    "provider_modified_at" TIMESTAMPTZ(3) NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "festivals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "festivals_source_external_id_key"
ON "festivals"("source", "external_id");

CREATE INDEX "festivals_event_start_date_event_end_date_idx"
ON "festivals"("event_start_date", "event_end_date");

CREATE INDEX "festivals_provider_region_code_event_start_date_idx"
ON "festivals"("provider_region_code", "event_start_date");

CREATE INDEX "festivals_provider_modified_at_idx"
ON "festivals"("provider_modified_at");

COMMENT ON TABLE "festivals" IS 'TourAPI에서 동기화한 축제 기본 정보';
COMMENT ON COLUMN "festivals"."id" IS 'Haetteum 내부 축제 식별자';
COMMENT ON COLUMN "festivals"."source" IS '축제 원본 provider 식별자';
COMMENT ON COLUMN "festivals"."external_id" IS 'provider가 부여한 축제 식별자';
COMMENT ON COLUMN "festivals"."content_type_id" IS 'TourAPI 콘텐츠 타입 ID';
COMMENT ON COLUMN "festivals"."title" IS '축제명';
COMMENT ON COLUMN "festivals"."event_start_date" IS '축제 시작일';
COMMENT ON COLUMN "festivals"."event_end_date" IS '축제 종료일';
COMMENT ON COLUMN "festivals"."provider_region_code" IS 'TourAPI 법정동 시도 코드';
COMMENT ON COLUMN "festivals"."provider_district_code" IS 'TourAPI 법정동 시군구 코드';
COMMENT ON COLUMN "festivals"."address1" IS '기본 주소';
COMMENT ON COLUMN "festivals"."address2" IS '상세 주소';
COMMENT ON COLUMN "festivals"."zipcode" IS '우편번호';
COMMENT ON COLUMN "festivals"."longitude" IS 'WGS84 경도';
COMMENT ON COLUMN "festivals"."latitude" IS 'WGS84 위도';
COMMENT ON COLUMN "festivals"."map_level" IS 'TourAPI 지도 확대 레벨';
COMMENT ON COLUMN "festivals"."category1" IS 'TourAPI 신분류 대분류 코드';
COMMENT ON COLUMN "festivals"."category2" IS 'TourAPI 신분류 중분류 코드';
COMMENT ON COLUMN "festivals"."category3" IS 'TourAPI 신분류 소분류 코드';
COMMENT ON COLUMN "festivals"."telephone" IS '축제 안내 전화번호';
COMMENT ON COLUMN "festivals"."primary_image_url" IS '대표 원본 이미지 URL';
COMMENT ON COLUMN "festivals"."primary_thumbnail_url" IS '대표 썸네일 이미지 URL';
COMMENT ON COLUMN "festivals"."image_copyright_type" IS '대표 이미지 공공누리 저작권 유형';
COMMENT ON COLUMN "festivals"."provider_created_at" IS 'provider 콘텐츠 최초 등록 시각';
COMMENT ON COLUMN "festivals"."provider_modified_at" IS 'provider 콘텐츠 최종 수정 시각';
COMMENT ON COLUMN "festivals"."last_synced_at" IS '내부 DB에 마지막으로 정상 반영한 시각';
COMMENT ON COLUMN "festivals"."created_at" IS '내부 레코드 생성 시각';
COMMENT ON COLUMN "festivals"."updated_at" IS '내부 레코드 최종 수정 시각';
