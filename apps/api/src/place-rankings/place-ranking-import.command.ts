import { parseRankingDirectoryArg } from "../common/ranking-import/ranking-command-args.js";
import {
  isMainModule,
  runRankingCommand,
} from "../common/ranking-import/ranking-command-runner.js";
import type {
  PlaceRankingImportService,
  PlaceRankingImportSummary,
} from "./place-ranking-import.service.js";

type CommandOutput = (message: string) => void;
type PlaceRankingImportRunner = Pick<
  PlaceRankingImportService,
  "importDirectory"
>;

export async function executePlaceRankingImport(
  service: PlaceRankingImportRunner,
  argv: string[],
  output: CommandOutput,
  errorOutput: CommandOutput,
): Promise<number> {
  try {
    const directory = parseRankingDirectoryArg(argv);
    const summary = await service.importDirectory(directory);
    output(JSON.stringify(summaryJson(summary)));
    return 0;
  } catch {
    errorOutput("Place ranking import command failed.");
    return 1;
  }
}

function summaryJson(summary: PlaceRankingImportSummary) {
  return {
    source: summary.source,
    scope: summary.scope,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    audienceCount: summary.audienceCount,
    importedCount: summary.importedCount,
    matchedCount: summary.matchedCount,
    unmatchedCount: summary.unmatchedCount,
  };
}

async function run(): Promise<void> {
  await runRankingCommand(
    "Place ranking import command",
    false,
    () =>
      Promise.all([
        import("../app.module.js"),
        import("./place-ranking-import.service.js"),
      ]).then(([appModule, serviceModule]) => ({
        AppModule: appModule.AppModule,
        PlaceRankingImportService: serviceModule.PlaceRankingImportService,
      })),
    async (app, { PlaceRankingImportService }) => {
      const service = app.get(PlaceRankingImportService);
      return executePlaceRankingImport(
        service,
        process.argv.slice(2),
        (message) => console.log(message),
        (message) => console.error(message),
      );
    },
  );
}

if (isMainModule(import.meta.url)) {
  void run();
}
