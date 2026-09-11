CREATE TABLE "chat_daily_usage" (
    "subject_key" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0 CHECK ("used" >= 0),
    CONSTRAINT "chat_daily_usage_pkey" PRIMARY KEY ("subject_key", "day")
);
CREATE INDEX "chat_daily_usage_day_idx" ON "chat_daily_usage"("day");
