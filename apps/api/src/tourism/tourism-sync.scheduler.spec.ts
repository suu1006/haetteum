import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import { TourApiError } from "./tour-api.client.js";
import { TourismSyncService } from "./tourism-sync.service.js";
import { TourismSyncScheduler } from "./tourism-sync.scheduler.js";

function createScheduler(
  enabled: boolean,
  incrementalSync: () => Promise<void> = () => Promise.resolve(),
): {
  scheduler: TourismSyncScheduler;
  incrementalCalls: number;
} {
  let incrementalCalls = 0;
  const config = {
    get: () => enabled,
  } as unknown as ConfigService<ApiEnvironment, true>;
  const sync = {
    enrichPendingPlaceDetails: () => Promise.resolve({ failedCount: 0 }),
    incrementalSync: () => {
      incrementalCalls += 1;
      return incrementalSync();
    },
  } as unknown as TourismSyncService;

  return {
    scheduler: new TourismSyncScheduler(config, sync, {
      batch: (work: () => Promise<unknown>) => work(),
    } as never),
    get incrementalCalls() {
      return incrementalCalls;
    },
  };
}

describe("TourismSyncScheduler", () => {
  it("does not call the provider when tourism sync is disabled", async () => {
    const scheduler = createScheduler(false);

    await expect(scheduler.scheduler.runDailySync()).resolves.toBeUndefined();

    expect(scheduler.incrementalCalls).toBe(0);
  });

  it("runs incremental sync when enabled", async () => {
    const scheduler = createScheduler(true);

    await scheduler.scheduler.runDailySync();

    expect(scheduler.incrementalCalls).toBe(1);
  });

  it("propagates sync failures to Nest scheduler logging without exposing credentials", async () => {
    const providerFailure = new TourApiError(
      "areaBasedSyncList2",
      "NETWORK_ERROR",
    );
    const scheduler = createScheduler(true, () =>
      Promise.reject(providerFailure),
    );

    await expect(scheduler.scheduler.runDailySync()).rejects.toBe(
      providerFailure,
    );

    expect(providerFailure.message).not.toContain("serviceKey");
    expect(providerFailure.message).not.toContain("SERVICE_KEY");
  });
});
