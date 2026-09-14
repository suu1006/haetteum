CREATE TABLE "uploaded_images" (
  "id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "purpose" VARCHAR(16) NOT NULL,
  "data" BYTEA NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uploaded_images_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uploaded_images_purpose_check" CHECK ("purpose" IN ('REVIEW', 'PROFILE')),
  CONSTRAINT "uploaded_images_dimensions_check" CHECK ("width" > 0 AND "height" > 0 AND "width" <= CASE WHEN "purpose" = 'PROFILE' THEN 512 ELSE 2048 END AND "height" <= CASE WHEN "purpose" = 'PROFILE' THEN 512 ELSE 2048 END),
  CONSTRAINT "uploaded_images_size_check" CHECK ("byte_size" = octet_length("data") AND "byte_size" > 0 AND "byte_size" <= 5242880),
  CONSTRAINT "uploaded_images_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "uploaded_images_owner_id_created_at_idx" ON "uploaded_images"("owner_id", "created_at");
ALTER TABLE "users" ADD COLUMN "profile_image_id" UUID;
ALTER TABLE "users" ADD CONSTRAINT "users_profile_image_id_fkey" FOREIGN KEY ("profile_image_id") REFERENCES "uploaded_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "users_profile_image_id_idx" ON "users"("profile_image_id");
ALTER TABLE "review_images" ADD COLUMN "uploaded_image_id" UUID;
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_uploaded_image_id_fkey" FOREIGN KEY ("uploaded_image_id") REFERENCES "uploaded_images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "review_images_uploaded_image_id_idx" ON "review_images"("uploaded_image_id");
COMMENT ON TABLE "uploaded_images" IS '사용자가 업로드한 검증된 WebP 바이너리. 기존 URL 이미지는 별도 유지.';
COMMENT ON COLUMN "uploaded_images"."data" IS 'WebP 원시 바이너리(bytea). Base64 문자열이 아님.';
