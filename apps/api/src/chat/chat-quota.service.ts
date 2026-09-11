import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service.js";

export const CHAT_QUOTA_CLOCK = Symbol("CHAT_QUOTA_CLOCK");
const DAY_MS = 86_400_000;
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

export type ChatIdentity = { userId: string };

@Injectable()
export class ChatQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CHAT_QUOTA_CLOCK) private readonly now: () => number,
  ) {}

  async consume(
    identity: ChatIdentity,
  ): Promise<{ remaining: number; resetsAt: string }> {
    const koreaDay = Math.floor((this.now() + KOREA_OFFSET_MS) / DAY_MS);
    const day = new Date(koreaDay * DAY_MS).toISOString().slice(0, 10);
    const resetsAt = new Date(
      (koreaDay + 1) * DAY_MS - KOREA_OFFSET_MS,
    ).toISOString();
    const limit = 10;
    const subjectKey = `user:${identity.userId}`;

    // One PostgreSQL statement: concurrent callers cannot all pass a separate read.
    const rows = await this.prisma.$queryRaw<{ used: number }[]>`
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

  @Cron("0 10 0 * * *", { timeZone: "Asia/Seoul" })
  async cleanup(): Promise<void> {
    const cutoff = new Date(this.now() + KOREA_OFFSET_MS - 7 * DAY_MS)
      .toISOString()
      .slice(0, 10);
    await this.prisma
      .$executeRaw`DELETE FROM chat_daily_usage WHERE day < ${cutoff}::date`;
  }
}
