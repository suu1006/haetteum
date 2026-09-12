import { TourApiPolicy } from "./tour-api-policy.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NestFactory } from "@nestjs/core";

import type { FestivalSyncService } from "./festival-sync.service.js";
import { FESTIVAL_SYNC_RANGE } from "./tourism.constants.js";

export { FESTIVAL_SYNC_RANGE };

type CommandOutput = (message: string) => void;
type FestivalSyncRunner = Pick<FestivalSyncService, "fullSync">;

export async function executeFestivalSync(
  service: FestivalSyncRunner,
  output: CommandOutput,
  errorOutput: CommandOutput,
): Promise<number> {
  try {
    const summary = await service.fullSync(FESTIVAL_SYNC_RANGE);
    output(
      JSON.stringify({
        jobType: "FESTIVAL_FULL",
        status: summary.status,
        rangeStart: "2026-01-01",
        rangeEnd: "2027-12-31",
        fetchedCount: summary.fetchedCount,
        insertedCount: summary.insertedCount,
        updatedCount: summary.updatedCount,
        deactivatedCount: summary.deactivatedCount,
        failedCount: summary.failedCount,
        runId: summary.runId,
      }),
    );
    return summary.failedCount > 0 ? 1 : 0;
  } catch {
    errorOutput("Festival sync command failed.");
    return 1;
  }
}

async function run(): Promise<void> {
  process.env.SCHEDULERS_ENABLED = "false";
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    const [{ AppModule }, { FestivalSyncService }] = await Promise.all([
      import("../app.module.js"),
      import("./festival-sync.service.js"),
    ]);
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const service = app.get(FestivalSyncService);
    const exitCode = await app.get(TourApiPolicy).batch(() =>
      executeFestivalSync(
        service,
        (message) => console.log(message),
        (message) => console.error(message),
      ),
    );
    if (exitCode !== 0) process.exitCode = exitCode;
  } catch {
    console.error("Festival sync command failed.");
    process.exitCode = 1;
  } finally {
    if (app != null) {
      try {
        await app.close();
      } catch {
        console.error("Festival sync command shutdown failed.");
        process.exitCode = 1;
      }
    }
  }
}

function isMainModule(): boolean {
  const commandPath = process.argv[1];
  return (
    commandPath !== undefined &&
    resolve(commandPath) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  void run();
}
