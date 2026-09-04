-- CreateTable
CREATE TABLE "saved_courses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_course_stops" (
    "id" UUID NOT NULL,
    "saved_course_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "place_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "category_label" VARCHAR(200),
    "address" VARCHAR(500),
    "longitude" DECIMAL(10,7) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "distance_meters" INTEGER,
    "place_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_course_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_courses_user_id_created_at_idx" ON "saved_courses"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "saved_course_stops_place_id_idx" ON "saved_course_stops"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_course_stops_saved_course_id_sequence_key" ON "saved_course_stops"("saved_course_id", "sequence");

-- AddForeignKey
ALTER TABLE "saved_courses" ADD CONSTRAINT "saved_courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_course_stops" ADD CONSTRAINT "saved_course_stops_saved_course_id_fkey" FOREIGN KEY ("saved_course_id") REFERENCES "saved_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_course_stops" ADD CONSTRAINT "saved_course_stops_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
