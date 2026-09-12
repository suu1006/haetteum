import { jest } from "@jest/globals";
import { Logger } from "@nestjs/common";
import { CronExpression } from "@nestjs/schedule";

import type { PrismaService } from "../prisma/prisma.service.js";
import { SessionCleanupService } from "./session-cleanup.service.js";

describe("SessionCleanupService", () => {
  it("deletes sessions expired at or before the injected current time and logs only the count", async () => {
    const now = new Date("2026-08-26T12:00:00.000Z");
    const deleteMany = jest
      .fn<() => Promise<{ count: number }>>()
      .mockResolvedValue({ count: 3 });
    const prisma = {
      session: {
        deleteMany,
      },
    } as unknown as PrismaService;
    const log = jest
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => undefined);
    const service = new SessionCleanupService(prisma, () => now.getTime());

    await expect(service.removeExpired()).resolves.toBeUndefined();

    expect(deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: now } },
    });
    expect(log).toHaveBeenCalledWith("removedExpiredSessions=3");
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it("schedules expiry cleanup at 03:00 every day", () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SessionCleanupService.prototype,
      "removeExpired",
    );
    if (!descriptor || typeof descriptor.value !== "function") {
      throw new Error("Expected cleanup method descriptor");
    }
    const cleanupMethod = descriptor.value as unknown as object;

    expect(Reflect.getMetadata("SCHEDULE_CRON_OPTIONS", cleanupMethod)).toEqual(
      { cronTime: CronExpression.EVERY_DAY_AT_3AM },
    );
  });
});
