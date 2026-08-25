CREATE TABLE "tourism_regions" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(32) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "provider_code" VARCHAR(10) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tourism_regions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourism_districts" (
    "id" UUID NOT NULL,
    "region_id" UUID NOT NULL,
    "provider_code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tourism_districts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "external_id" VARCHAR(64) NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "region_id" UUID NOT NULL,
    "district_id" UUID,
    "title" VARCHAR(500) NOT NULL,
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
    "homepage" TEXT,
    "overview" TEXT,
    "primary_image_url" TEXT,
    "primary_thumbnail_url" TEXT,
    "image_copyright_type" VARCHAR(20),
    "provider_created_at" TIMESTAMPTZ(3),
    "provider_modified_at" TIMESTAMPTZ(3) NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourism_sync_runs" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "job_type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "requested_from" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "inserted_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "deactivated_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,

    CONSTRAINT "tourism_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tourism_regions_slug_key" ON "tourism_regions"("slug");
CREATE UNIQUE INDEX "tourism_regions_provider_code_key" ON "tourism_regions"("provider_code");
CREATE UNIQUE INDEX "tourism_districts_provider_code_key" ON "tourism_districts"("provider_code");
CREATE INDEX "tourism_districts_region_id_idx" ON "tourism_districts"("region_id");
CREATE UNIQUE INDEX "places_source_external_id_key" ON "places"("source", "external_id");
CREATE INDEX "places_region_id_is_visible_idx" ON "places"("region_id", "is_visible");
CREATE INDEX "places_district_id_is_visible_idx" ON "places"("district_id", "is_visible");
CREATE INDEX "places_content_type_id_is_visible_idx" ON "places"("content_type_id", "is_visible");
CREATE INDEX "places_provider_modified_at_idx" ON "places"("provider_modified_at");
CREATE INDEX "tourism_sync_runs_provider_status_finished_at_idx" ON "tourism_sync_runs"("provider", "status", "finished_at");

ALTER TABLE "tourism_districts"
ADD CONSTRAINT "tourism_districts_region_id_fkey"
FOREIGN KEY ("region_id") REFERENCES "tourism_regions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "places"
ADD CONSTRAINT "places_region_id_fkey"
FOREIGN KEY ("region_id") REFERENCES "tourism_regions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "places"
ADD CONSTRAINT "places_district_id_fkey"
FOREIGN KEY ("district_id") REFERENCES "tourism_districts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "tourism_regions"
    ("id", "slug", "name", "provider_code", "display_order", "is_active", "created_at", "updated_at")
VALUES
    ('00000000-0000-4000-8000-000000000011', 'seoul', '서울', '11', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000041', 'gyeonggi', '경기', '41', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000051', 'gangwon', '강원', '51', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000026', 'busan', '부산', '26', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000050', 'jeju', '제주', '50', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
