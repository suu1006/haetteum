import {
  isMainModule,
  runRankingCommand,
} from "../common/ranking-import/ranking-command-runner.js";
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
  await runRankingCommand(
    "Ranking image backfill command",
    ["error", "warn"],
    () =>
      Promise.all([
        import("../app.module.js"),
        import("./place-ranking-import.service.js"),
        import("../hot-place-rankings/hot-place-ranking-import.service.js"),
      ]).then(([appModule, placeModule, hotModule]) => ({
        AppModule: appModule.AppModule,
        PlaceRankingImportService: placeModule.PlaceRankingImportService,
        HotPlaceRankingImportService: hotModule.HotPlaceRankingImportService,
      })),
    async (
      app,
      { PlaceRankingImportService, HotPlaceRankingImportService },
    ) => {
      const placeRankings = app.get<PlaceRankingImportService>(
        PlaceRankingImportService,
      );
      const hotPlaceRankings = app.get<HotPlaceRankingImportService>(
        HotPlaceRankingImportService,
      );
      return executeRankingImageBackfill(
        placeRankings,
        hotPlaceRankings,
        (message) => console.log(message),
        (message) => console.error(message),
      );
    },
  );
}

if (isMainModule(import.meta.url)) {
  void run();
}
