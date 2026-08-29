import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NestFactory } from "@nestjs/core";

import type { HotPlaceRankingImportService } from "../hot-place-rankings/hot-place-ranking-import.service.js";
import type {
  PlaceRankingImportService,
  RankingImageBackfillSummary,
} from "./place-ranking-import.service.js";

type CommandOutput = (message: string) => void;
type BackfillRunner = {
  backfillDisplayImages(): Promise<RankingImageBackfillSummary>;
};

export async function executeRankingImageBackfill(
  placeRankings: BackfillRunner,
  hotPlaceRankings: BackfillRunner,
  output: CommandOutput,
  errorOutput: CommandOutput,
): Promise<number> {
  try {
    const [placeRankingsSummary, hotPlaceRankingsSummary] = await Promise.all([
      placeRankings.backfillDisplayImages(),
      hotPlaceRankings.backfillDisplayImages(),
    ]);
    output(JSON.stringify({ placeRankingsSummary, hotPlaceRankingsSummary }));
    return 0;
  } catch {
    errorOutput("Ranking image backfill command failed.");
    return 1;
  }
}

async function run(): Promise<void> {
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    const [
      { AppModule },
      { PlaceRankingImportService: PlaceService },
      { HotPlaceRankingImportService: HotService },
    ] = await Promise.all([
      import("../app.module.js"),
      import("./place-ranking-import.service.js"),
      import("../hot-place-rankings/hot-place-ranking-import.service.js"),
    ]);
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ["error", "warn"],
    });
    const placeRankings = app.get<PlaceRankingImportService>(PlaceService);
    const hotPlaceRankings = app.get<HotPlaceRankingImportService>(HotService);
    const exitCode = await executeRankingImageBackfill(
      placeRankings,
      hotPlaceRankings,
      (message) => console.log(message),
      (message) => console.error(message),
    );
    if (exitCode !== 0) process.exitCode = exitCode;
  } catch {
    console.error("Ranking image backfill command failed.");
    process.exitCode = 1;
  } finally {
    if (app != null) {
      try {
        await app.close();
      } catch {
        console.error("Ranking image backfill command shutdown failed.");
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
