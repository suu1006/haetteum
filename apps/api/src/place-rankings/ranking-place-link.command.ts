import {
  isMainModule,
  runRankingCommand,
} from "../common/ranking-import/ranking-command-runner.js";
import type { HotPlaceRankingImportService } from "../hot-place-rankings/hot-place-ranking-import.service.js";
import type {
  PlaceRankingImportService,
  RankingPlaceLinkBackfillSummary,
} from "./place-ranking-import.service.js";

type CommandOutput = (message: string) => void;
type LinkRunner = {
  backfillPlaceLinks(): Promise<RankingPlaceLinkBackfillSummary>;
};

export async function executeRankingPlaceLink(
  placeRankings: LinkRunner,
  hotPlaceRankings: LinkRunner,
  output: CommandOutput,
  errorOutput: CommandOutput,
): Promise<number> {
  try {
    const placeRankingsSummary = await placeRankings.backfillPlaceLinks();
    const hotPlaceRankingsSummary = await hotPlaceRankings.backfillPlaceLinks();
    output(JSON.stringify({ placeRankingsSummary, hotPlaceRankingsSummary }));
    return 0;
  } catch {
    errorOutput("Ranking place link command failed.");
    return 1;
  }
}

async function run(): Promise<void> {
  await runRankingCommand(
    "Ranking place link command",
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
      return executeRankingPlaceLink(
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
