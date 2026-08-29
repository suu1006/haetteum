-- CreateTable
CREATE TABLE "tour_courses" (
    "id" UUID NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "external_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "overview" TEXT,
    "take_time" VARCHAR(200),
    "distance" VARCHAR(200),
    "schedule" VARCHAR(200),
    "theme" VARCHAR(200),
    "primary_image_url" TEXT,
    "longitude" DECIMAL(10,7),
    "latitude" DECIMAL(10,7),
    "provider_modified_at" TIMESTAMPTZ(3) NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tour_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_course_stops" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "external_place_id" VARCHAR(64) NOT NULL,
    "place_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "overview" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tour_course_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_courses_source_external_id_key" ON "tour_courses"("source", "external_id");

-- CreateIndex
CREATE INDEX "tour_course_stops_place_id_idx" ON "tour_course_stops"("place_id");

-- CreateIndex
CREATE INDEX "tour_course_stops_external_place_id_idx" ON "tour_course_stops"("external_place_id");

-- CreateIndex
CREATE UNIQUE INDEX "tour_course_stops_course_id_sequence_key" ON "tour_course_stops"("course_id", "sequence");

-- AddForeignKey
ALTER TABLE "tour_course_stops" ADD CONSTRAINT "tour_course_stops_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "tour_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_course_stops" ADD CONSTRAINT "tour_course_stops_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
