import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NestFactory } from "@nestjs/core";

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
    const directory = parseDirectoryArg(argv);
    const summary = await service.importDirectory(directory);
    output(JSON.stringify(summaryJson(summary)));
    return 0;
  } catch {
    errorOutput("Place ranking import command failed.");
    return 1;
  }
}

function parseDirectoryArg(argv: string[]): string {
  const separateArgIndex = argv.indexOf("--directory");

  if (separateArgIndex >= 0) {
    const directory = argv[separateArgIndex + 1];
    if (directory !== undefined && directory.trim() !== "") return directory;
    throw new Error("Missing directory");
  }

  const equalsArg = argv.find((arg) => arg.startsWith("--directory="));
  const directory = equalsArg?.slice("--directory=".length);

  if (directory !== undefined && directory.trim() !== "") return directory;

  throw new Error("Missing directory");
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
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    const [{ AppModule }, { PlaceRankingImportService }] = await Promise.all([
      import("../app.module.js"),
      import("./place-ranking-import.service.js"),
    ]);
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const service = app.get(PlaceRankingImportService);
    const exitCode = await executePlaceRankingImport(
      service,
      process.argv.slice(2),
      (message) => console.log(message),
      (message) => console.error(message),
    );
    if (exitCode !== 0) process.exitCode = exitCode;
  } catch {
    console.error("Place ranking import command failed.");
    process.exitCode = 1;
  } finally {
    if (app != null) {
      try {
        await app.close();
      } catch {
        console.error("Place ranking import command shutdown failed.");
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
