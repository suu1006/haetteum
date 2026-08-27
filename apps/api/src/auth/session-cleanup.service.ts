import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service.js";

export const SESSION_CLEANUP_CLOCK = Symbol("SESSION_CLEANUP_CLOCK");

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(SESSION_CLEANUP_CLOCK)
    private readonly clock: (() => number) | undefined = undefined,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeExpired(): Promise<void> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lte: this.now() } },
    });

    this.logger.log(`removedExpiredSessions=${result.count}`);
  }

  private now(): Date {
    return new Date((this.clock ?? Date.now)());
  }
}
