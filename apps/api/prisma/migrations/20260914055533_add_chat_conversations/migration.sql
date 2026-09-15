-- DropForeignKey
ALTER TABLE "weekly_recommendation_candidates" DROP CONSTRAINT "weekly_recommendation_candidates_edition_id_fkey";

-- AlterTable
ALTER TABLE "chat_requests" ADD COLUMN     "conversation_id" UUID;

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('user', 'assistant')),
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_conversations_user_id_updated_at_idx" ON "chat_conversations"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_recommendation_candidates" ADD CONSTRAINT "weekly_recommendation_candidates_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "weekly_recommendation_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
