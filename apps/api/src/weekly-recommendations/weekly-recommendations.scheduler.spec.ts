import { jest } from "@jest/globals";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import type { WeeklyRecommendationsService } from "./weekly-recommendations.service.js";
import { WeeklyRecommendationsScheduler } from "./weekly-recommendations.scheduler.js";

const jobs = [
  ["runPreparation", "prepare", "0 0 6 * * 6"],
  ["runValidation", "validate", "0 0 6 * * 0"],
  ["runPublication", "publish", "0 0 0 * * 1"],
  ["runRepair", "repair", "0 0 8 * * *"],
] as const;

function setup(enabled: boolean, fail = false) {
  const calls: string[] = [];
  const service = Object.fromEntries(
    jobs.map(([, operation]) => [
      operation,
      () => {
        calls.push(operation);
        return fail
          ? Promise.reject(new Error("serviceKey=secret"))
          : Promise.resolve();
      },
    ]),
  ) as unknown as WeeklyRecommendationsService;
  const config = {
    get: (key: string) => key === "WEEKLY_RECOMMENDATIONS_ENABLED" && enabled,
  } as unknown as ConfigService<ApiEnvironment, true>;
  return {
    calls,
    scheduler: new WeeklyRecommendationsScheduler(config, service),
  };
}

describe("WeeklyRecommendationsScheduler", () => {
  it.each(jobs)(
    "registers %s at its KST time without overlapping runs",
    (method, operation, cronTime) => {
      expect(
        Reflect.getMetadata(
          "SCHEDULE_CRON_OPTIONS",
          // Metadata inspection deliberately reads the unbound decorated method.
          // eslint-disable-next-line @typescript-eslint/unbound-method
          WeeklyRecommendationsScheduler.prototype[method],
        ),
      ).toMatchObject({
        cronTime,
        timeZone: "Asia/Seoul",
        waitForCompletion: true,
        name: `weekly-recommendations-${operation}`,
      });
    },
  );

  it("does no recommendation work while disabled", async () => {
    const { calls, scheduler } = setup(false);
    for (const [method] of jobs) await scheduler[method]();
    expect(calls).toEqual([]);
  });

  it.each(jobs)(
    "dispatches %s only to %s when enabled",
    async (method, operation) => {
      const { calls, scheduler } = setup(true);
      await scheduler[method]();
      expect(calls).toEqual([operation]);
    },
  );

  it.each(jobs)(
    "handles %s failures with safe structured logging",
    async (method, operation) => {
      const log = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => undefined);
      try {
        const { scheduler } = setup(true, true);
        await expect(scheduler[method]()).resolves.toBeUndefined();
        expect(log).toHaveBeenCalledWith(
          JSON.stringify({
            event: "weekly_recommendations_job_failed",
            operation,
            reason: "UNEXPECTED_ERROR",
          }),
        );
        expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
      } finally {
        log.mockRestore();
      }
    },
  );
});
