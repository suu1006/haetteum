import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import { FestivalSyncService } from "./festival-sync.service.js";
import { FestivalSyncScheduler } from "./festival-sync.scheduler.js";
import { FESTIVAL_SYNC_RANGE } from "./tourism.constants.js";

function createScheduler(
  enabled: boolean,
  fullSync: () => Promise<unknown> = () => Promise.resolve({}),
): {
  scheduler: FestivalSyncScheduler;
  calls: unknown[];
} {
  const calls: unknown[] = [];
  const config = {
    get: () => enabled,
  } as unknown as ConfigService<ApiEnvironment, true>;
  const sync = {
    fullSync: (range: unknown) => {
      calls.push(range);
      return fullSync();
    },
  } as unknown as FestivalSyncService;

  return {
    scheduler: new FestivalSyncScheduler(config, sync, {
      batch: (work: () => Promise<unknown>) => work(),
    } as never),
    calls,
  };
}

describe("FestivalSyncScheduler", () => {
  it("does not call the provider when tourism sync is disabled", async () => {
    const { scheduler, calls } = createScheduler(false);

    await expect(scheduler.runDailySync()).resolves.toBeUndefined();

    expect(calls).toEqual([]);
  });

  it("runs the approved fixed range when enabled", async () => {
    const { scheduler, calls } = createScheduler(true);

    await scheduler.runDailySync();

    expect(calls).toEqual([FESTIVAL_SYNC_RANGE]);
  });

  it("reports partial detail failures to the scheduler", async () => {
    const { scheduler } = createScheduler(true, () =>
      Promise.resolve({ failedCount: 2 }),
    );
    await expect(scheduler.runDailySync()).rejects.toThrow("2");
  });

  it("propagates sync failures without exposing credentials", async () => {
    const failure = new Error(
      "Festival synchronization failed (SERVICE_UNAVAILABLE)",
    );
    const { scheduler } = createScheduler(true, () => Promise.reject(failure));

    await expect(scheduler.runDailySync()).rejects.toBe(failure);

    expect(failure.message).not.toContain("serviceKey");
    expect(failure.message).not.toContain("SERVICE_KEY");
  });
});
