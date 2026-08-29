ALTER TABLE "place_rankings" ADD COLUMN "image_attribution" TEXT;
ALTER TABLE "place_rankings" ADD COLUMN "image_attribution_url" TEXT;

ALTER TABLE "hot_place_rankings" ADD COLUMN "image_attribution" TEXT;
ALTER TABLE "hot_place_rankings" ADD COLUMN "image_attribution_url" TEXT;

COMMENT ON COLUMN "place_rankings"."image_attribution" IS 'TourAPI 밖에서(Wikimedia Commons 등) 가져온 이미지의 저작자 표시 문구';
COMMENT ON COLUMN "place_rankings"."image_attribution_url" IS 'imageAttribution 문구가 링크할 출처 페이지 URL';
COMMENT ON COLUMN "hot_place_rankings"."image_attribution" IS 'TourAPI 밖에서(Wikimedia Commons 등) 가져온 이미지의 저작자 표시 문구';
COMMENT ON COLUMN "hot_place_rankings"."image_attribution_url" IS 'imageAttribution 문구가 링크할 출처 페이지 URL';
