import { createHash, randomUUID } from "node:crypto";
import { type ChatRequest } from "@haetteum/contracts";
import { type Prisma } from "../generated/prisma/client.js";
import { chatHttpError } from "./chat-errors.js";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service.js";

export const CHAT_QUOTA_CLOCK = Symbol("CHAT_QUOTA_CLOCK");
const DAY_MS = 86_400_000;
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

export type ChatIdentity = { userId: string };

export type ChatReservation = {
  subjectKey: string;
  requestId: string;
  attemptId: string;
  reply?: string;
};

@Injectable()
export class ChatQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CHAT_QUOTA_CLOCK) private readonly now: () => number,
  ) {}

  async consume(
    identity: ChatIdentity,
    store: Pick<Prisma.TransactionClient, "$queryRaw"> = this.prisma,
    timestamp = this.now(),
  ): Promise<{ remaining: number; resetsAt: string }> {
    const koreaDay = Math.floor((timestamp + KOREA_OFFSET_MS) / DAY_MS);
    const day = new Date(koreaDay * DAY_MS).toISOString().slice(0, 10);
    const resetsAt = new Date(
      (koreaDay + 1) * DAY_MS - KOREA_OFFSET_MS,
    ).toISOString();
    const limit = 10;
    const subjectKey = `user:${identity.userId}`;

    // One PostgreSQL statement: concurrent callers cannot all pass a separate read.
    const rows = await store.$queryRaw<{ used: number }[]>`
      INSERT INTO chat_daily_usage (subject_key, day, used)
      VALUES (${subjectKey}, ${day}::date, 1)
      ON CONFLICT (subject_key, day) DO UPDATE
      SET used = chat_daily_usage.used + 1
      WHERE chat_daily_usage.used < ${limit}
      RETURNING used
    `;
    if (!rows[0]) {
      throw new HttpException(
        {
          code: "CHAT_DAILY_LIMIT",
          detail: "오늘 질문 횟수를 모두 사용했어요. 내일 다시 이용해 주세요.",
          resetsAt,
        },
        429,
      );
    }
    return { remaining: limit - rows[0].used, resetsAt };
  }

  async reserve(
    identity: ChatIdentity,
    request: ChatRequest,
  ): Promise<ChatReservation> {
    const subjectKey = `user:${identity.userId}`;
    // Older clients without an ID retain one-request-per-call behavior.
    const requestId = (request.requestId ?? randomUUID()).toLowerCase();
    const attemptId = randomUUID();
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(request.messages))
      .digest("hex");
    return this.prisma.$transaction(async (tx) => {
      // Transaction-scoped lock serializes the same logical request across instances.
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${subjectKey + ":" + requestId}, 0))`;
      const rows = await tx.$queryRaw<
        { status: string; payload_hash: string; reply: string | null }[]
      >`
        SELECT status, payload_hash, reply FROM chat_requests
        WHERE subject_key = ${subjectKey} AND request_id = ${requestId}::uuid FOR UPDATE
      `;
      const existing = rows[0];
      if (existing) {
        if (existing.payload_hash !== payloadHash) throw chatHttpError(409);
        if (existing.status === "COMPLETED") {
          return { subjectKey, requestId, attemptId, reply: existing.reply! };
        }
        if (existing.status !== "REFUNDED") throw chatHttpError(409);
      }
      const timestamp = this.now();
      const day = new Date(timestamp + KOREA_OFFSET_MS)
        .toISOString()
        .slice(0, 10);
      await this.consume(identity, tx, timestamp);
      await tx.$executeRaw`
        INSERT INTO chat_requests (subject_key, request_id, payload_hash, day, status, attempt_id)
        VALUES (${subjectKey}, ${requestId}::uuid, ${payloadHash}, ${day}::date, 'RESERVED', ${attemptId}::uuid)
        ON CONFLICT (subject_key, request_id) DO UPDATE
        SET day = EXCLUDED.day, status = 'RESERVED', attempt_id = EXCLUDED.attempt_id,
            reply = NULL, updated_at = CURRENT_TIMESTAMP
      `;
      return { subjectKey, requestId, attemptId };
    });
  }

  async settle(
    reservation: ChatReservation,
    status: "COMPLETED" | "REFUNDED" | "CANCELLED",
    reply?: string,
  ): Promise<void> {
    if (reservation.reply !== undefined) return;
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ day: Date }[]>`
        UPDATE chat_requests SET status = ${status}, reply = ${reply ?? null}, updated_at = CURRENT_TIMESTAMP
        WHERE subject_key = ${reservation.subjectKey} AND request_id = ${reservation.requestId}::uuid
          AND attempt_id = ${reservation.attemptId}::uuid AND status = 'RESERVED'
        RETURNING day
      `;
      // The guarded state transition ensures repeated callbacks cannot refund twice.
      if (status === "REFUNDED" && rows[0]) {
        await tx.$executeRaw`
          UPDATE chat_daily_usage SET used = used - 1
          WHERE subject_key = ${reservation.subjectKey} AND day = ${rows[0].day}::date AND used > 0
        `;
      }
    });
  }

  @Cron("0 10 0 * * *", { timeZone: "Asia/Seoul" })
  async cleanup(): Promise<void> {
    const cutoff = new Date(this.now() + KOREA_OFFSET_MS - 7 * DAY_MS)
      .toISOString()
      .slice(0, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM chat_requests WHERE day < ${cutoff}::date AND status != 'RESERVED'`;
      await tx.$executeRaw`DELETE FROM chat_daily_usage WHERE day < ${cutoff}::date
        AND NOT EXISTS (SELECT 1 FROM chat_requests r WHERE r.subject_key = chat_daily_usage.subject_key AND r.day = chat_daily_usage.day)`;
    });
  }
}
