-- CreateTable
CREATE TABLE "pending_email_signups" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "code_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pending_email_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_email_signups_email_key" ON "pending_email_signups"("email");

-- CreateIndex
CREATE INDEX "pending_email_signups_code_expires_at_idx" ON "pending_email_signups"("code_expires_at");
