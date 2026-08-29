ALTER TABLE "place_rankings" ADD COLUMN "primary_image_url" TEXT;
ALTER TABLE "place_rankings" ADD COLUMN "image_copyright_type" VARCHAR(20);

ALTER TABLE "hot_place_rankings" ADD COLUMN "primary_image_url" TEXT;
ALTER TABLE "hot_place_rankings" ADD COLUMN "image_copyright_type" VARCHAR(20);

COMMENT ON COLUMN "place_rankings"."primary_image_url" IS '랭킹 노출용 대표 이미지 URL이며 매칭된 관광지 또는 TourAPI 키워드 검색에서 확정';
COMMENT ON COLUMN "place_rankings"."image_copyright_type" IS '대표 이미지 공공누리 저작권 유형';
COMMENT ON COLUMN "hot_place_rankings"."primary_image_url" IS '랭킹 노출용 대표 이미지 URL이며 매칭된 관광지 또는 TourAPI 키워드 검색에서 확정';
COMMENT ON COLUMN "hot_place_rankings"."image_copyright_type" IS '대표 이미지 공공누리 저작권 유형';
