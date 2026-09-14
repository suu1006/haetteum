CREATE TABLE "review_reports" (
  "id" UUID NOT NULL,
  "reporter_id" UUID NOT NULL,
  "review_id" UUID,
  "review_id_snapshot" UUID NOT NULL,
  "author_id_snapshot" UUID NOT NULL,
  "reason" VARCHAR(32) NOT NULL,
  "details" VARCHAR(1000) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "content_snapshot" VARCHAR(500) NOT NULL,
  "title_snapshot" VARCHAR(30) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "review_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "review_reports_reporter_id_review_id_key" ON "review_reports"("reporter_id", "review_id");
CREATE INDEX "review_reports_status_created_at_idx" ON "review_reports"("status", "created_at");
CREATE TABLE "user_blocks" (
  "blocker_id" UUID NOT NULL,
  "blocked_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_user_id"),
  CONSTRAINT "user_blocks_no_self" CHECK ("blocker_id" <> "blocked_user_id"),
  CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_blocks_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "user_blocks_blocked_user_id_idx" ON "user_blocks"("blocked_user_id");
