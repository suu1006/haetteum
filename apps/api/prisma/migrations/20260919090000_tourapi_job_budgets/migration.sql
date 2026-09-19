CREATE TABLE "tour_api_job_daily_usage" (
  "day" DATE NOT NULL,
  "job" VARCHAR(32) NOT NULL,
  "calls" INTEGER NOT NULL CHECK ("calls" >= 0),
  PRIMARY KEY ("day", "job")
);
