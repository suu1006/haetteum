import { parseRankingDirectoryArg } from "../common/ranking-import/ranking-command-args.js";
import {
  isMainModule,
  runRankingCommand,
} from "../common/ranking-import/ranking-command-runner.js";
import type {
  HotPlaceRankingImportService,
  HotPlaceRankingImportSummary,
} from "./hot-place-ranking-import.service.js";

type CommandOutput = (message: string) => void;
type HotPlaceRankingImportRunner = Pick<
  HotPlaceRankingImportService,
  "importDirectory"
>;

export async function executeHotPlaceRankingImport(
  service: HotPlaceRankingImportRunner,
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
    errorOutput("Hot place ranking import command failed.");
    return 1;
  }
}

function summaryJson(summary: HotPlaceRankingImportSummary) {
  return {
    source: summary.source,
    scope: summary.scope,
    baseYearMonth: summary.baseYearMonth,
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
    "Hot place ranking import command",
    false,
    () =>
      Promise.all([
        import("../app.module.js"),
        import("./hot-place-ranking-import.service.js"),
      ]).then(([appModule, serviceModule]) => ({
        AppModule: appModule.AppModule,
        HotPlaceRankingImportService:
          serviceModule.HotPlaceRankingImportService,
      })),
    async (app, { HotPlaceRankingImportService }) => {
      const service = app.get(HotPlaceRankingImportService);
      return executeHotPlaceRankingImport(
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
