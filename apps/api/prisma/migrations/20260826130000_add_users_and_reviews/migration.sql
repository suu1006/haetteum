CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_user_id" VARCHAR(191) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_provider_provider_user_id_key"
ON "users"("provider", "provider_user_id");

CREATE UNIQUE INDEX "reviews_user_id_place_id_key"
ON "reviews"("user_id", "place_id");

CREATE INDEX "reviews_user_id_updated_at_idx"
ON "reviews"("user_id", "updated_at");

CREATE INDEX "reviews_place_id_idx"
ON "reviews"("place_id");

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

COMMENT ON TABLE "users" IS 'Haetteum 서비스 사용자';
COMMENT ON COLUMN "users"."id" IS 'Haetteum 내부 사용자 식별자';
COMMENT ON COLUMN "users"."provider" IS '사용자 인증 provider 식별자';
COMMENT ON COLUMN "users"."provider_user_id" IS 'provider가 부여한 사용자 식별자';
COMMENT ON COLUMN "users"."display_name" IS '사용자 표시 이름';
COMMENT ON COLUMN "users"."created_at" IS '내부 레코드 생성 시각';
COMMENT ON COLUMN "users"."updated_at" IS '내부 레코드 최종 수정 시각';

COMMENT ON TABLE "reviews" IS '사용자가 작성한 관광지 후기';
COMMENT ON COLUMN "reviews"."id" IS '후기 식별자';
COMMENT ON COLUMN "reviews"."user_id" IS '후기 소유 사용자 식별자';
COMMENT ON COLUMN "reviews"."place_id" IS '후기 대상 관광지 식별자';
COMMENT ON COLUMN "reviews"."rating" IS '1부터 5까지의 정수 별점';
COMMENT ON COLUMN "reviews"."content" IS '후기 본문';
COMMENT ON COLUMN "reviews"."created_at" IS '후기 최초 작성 시각';
COMMENT ON COLUMN "reviews"."updated_at" IS '후기 최근 수정 시각';

INSERT INTO "users" (
  "id", "provider", "provider_user_id", "display_name", "created_at", "updated_at"
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'TEST',
  'test-user',
  '테스트 여행자',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("provider", "provider_user_id") DO NOTHING;
