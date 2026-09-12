CREATE TABLE "weekly_recommendation_editions" (
 "id" UUID NOT NULL, "week" DATE NOT NULL, "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
 "error_code" VARCHAR(100), "verified_at" TIMESTAMPTZ(3), "published_at" TIMESTAMPTZ(3),
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "weekly_recommendation_editions_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "weekly_edition_status_check" CHECK ("status" IN ('DRAFT','VERIFIED','PUBLISHED','FAILED'))
);
CREATE UNIQUE INDEX "weekly_recommendation_editions_week_key" ON "weekly_recommendation_editions"("week");
CREATE INDEX "weekly_recommendation_editions_status_week_idx" ON "weekly_recommendation_editions"("status","week");
CREATE TABLE "weekly_recommendation_candidates" (
 "id" UUID NOT NULL, "edition_id" UUID NOT NULL, "place_id" UUID NOT NULL,
 "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING', "kind" VARCHAR(32) NOT NULL, "reason" VARCHAR(100),
 "checks" JSONB NOT NULL DEFAULT '{}', "snapshot" JSONB NOT NULL,
 "checked_at" TIMESTAMPTZ(3), "position" INTEGER,
 CONSTRAINT "weekly_recommendation_candidates_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "weekly_recommendation_candidates_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "weekly_recommendation_editions"("id") ON DELETE CASCADE,
 CONSTRAINT "weekly_candidate_status_check" CHECK ("status" IN ('PENDING','PREPARED','PASSED','REJECTED'))
);
CREATE UNIQUE INDEX "weekly_recommendation_candidates_edition_id_place_id_key" ON "weekly_recommendation_candidates"("edition_id","place_id");
CREATE INDEX "weekly_recommendation_candidates_edition_id_status_position_idx" ON "weekly_recommendation_candidates"("edition_id","status","position");
CREATE INDEX "weekly_recommendation_candidates_place_id_idx" ON "weekly_recommendation_candidates"("place_id");
CREATE TABLE "weekly_recommendation_leases" ("name" TEXT NOT NULL, "token" TEXT NOT NULL, "expires_at" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "weekly_recommendation_leases_pkey" PRIMARY KEY("name"));
