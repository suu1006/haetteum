CREATE TABLE "tour_api_captures" (
 "id" UUID NOT NULL, "job" VARCHAR(32) NOT NULL, "scope" VARCHAR(200) NOT NULL,
 "content_id" VARCHAR(64), "source_version" VARCHAR(64), "operation" VARCHAR(64) NOT NULL,
 "parameters" JSONB NOT NULL, "request_key" VARCHAR(64) NOT NULL, "body" TEXT NOT NULL,
 "http_status" INTEGER NOT NULL, "truncated" BOOLEAN NOT NULL DEFAULT false,
 "state" VARCHAR(32) NOT NULL DEFAULT 'CAPTURED', "captured_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "completed_at" TIMESTAMPTZ(3), PRIMARY KEY ("id"),
 CONSTRAINT "capture_body_bound" CHECK (octet_length(body) <= 2097152),
 CONSTRAINT "capture_state" CHECK (state IN ('CAPTURED','VALIDATED','INVALID_SCHEMA','REJECTED','COMPLETE'))
);
CREATE INDEX "tour_api_captures_job_scope_operation_request_key_captured_at_idx" ON "tour_api_captures"("job", "scope", "operation", "request_key", "captured_at");
CREATE INDEX "tour_api_captures_state_completed_at_idx" ON "tour_api_captures"("state", "completed_at");
CREATE TABLE "tour_api_item_recovery" (
 "job" VARCHAR(32) NOT NULL, "content_id" VARCHAR(64) NOT NULL, "source_version" VARCHAR(64) NOT NULL,
 "stage" VARCHAR(32) NOT NULL, "code" VARCHAR(64) NOT NULL, "attempt_count" INTEGER NOT NULL DEFAULT 0,
 "next_attempt_at" TIMESTAMPTZ(3), "state" VARCHAR(32) NOT NULL, "updated_at" TIMESTAMPTZ(3) NOT NULL,
 PRIMARY KEY ("job", "content_id", "source_version"),
 CONSTRAINT "recovery_state" CHECK (state IN ('FAILED','QUARANTINED','COMPLETE'))
);
CREATE INDEX "tour_api_item_recovery_job_state_next_attempt_at_idx" ON "tour_api_item_recovery"("job", "state", "next_attempt_at");
