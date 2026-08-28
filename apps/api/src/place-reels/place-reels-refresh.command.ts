import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NestFactory } from "@nestjs/core";

import type { PlaceRankingAudience } from "@haetteum/contracts";

import type { PlaceReelsRefreshService } from "./place-reels-refresh.service.js";

type CommandOutput = (message: string) => void;
type PlaceReelsRefreshRunner = Pick<
  PlaceReelsRefreshService,
  "refreshRankedPlaces"
>;

const AUDIENCES: readonly PlaceRankingAudience[] = [
  "all",
  "20s",
  "30s",
  "40s",
  "50s",
  "60s-plus",
];

export async function executePlaceReelsRefresh(
  service: PlaceReelsRefreshRunner,
  argv: string[],
  output: CommandOutput,
  errorOutput: CommandOutput,
): Promise<number> {
  try {
    const summary = await service.refreshRankedPlaces({
      audience: parseAudienceArg(argv),
      limit: parseLimitArg(argv),
    });
    output(JSON.stringify(summary));
    return 0;
  } catch {
    errorOutput("Place reels refresh command failed.");
    return 1;
  }
}

function readArg(argv: string[], name: string): string | undefined {
  const separateIndex = argv.indexOf(`--${name}`);
  if (separateIndex >= 0) {
    const value = argv[separateIndex + 1];
    if (value !== undefined && !value.startsWith("--")) return value;
  }
  const equalsArg = argv.find((arg) => arg.startsWith(`--${name}=`));
  return equalsArg?.slice(`--${name}=`.length);
}

function parseAudienceArg(argv: string[]): PlaceRankingAudience | undefined {
  const value = readArg(argv, "audience");
  if (value === undefined) return undefined;
  if (!AUDIENCES.includes(value as PlaceRankingAudience)) {
    throw new Error(`Unknown audience: ${value}`);
  }
  return value as PlaceRankingAudience;
}

function parseLimitArg(argv: string[]): number | undefined {
  const value = readArg(argv, "limit");
  if (value === undefined) return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error(`Invalid limit: ${value}`);
  }
  return limit;
}

async function run(): Promise<void> {
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    const [{ AppModule }, { PlaceReelsRefreshService }] = await Promise.all([
      import("../app.module.js"),
      import("./place-reels-refresh.service.js"),
    ]);
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ["error", "warn"],
    });
    const service = app.get(PlaceReelsRefreshService);
    const exitCode = await executePlaceReelsRefresh(
      service,
      process.argv.slice(2),
      (message) => console.log(message),
      (message) => console.error(message),
    );
    if (exitCode !== 0) process.exitCode = exitCode;
  } catch {
    console.error("Place reels refresh command failed.");
    process.exitCode = 1;
  } finally {
    if (app != null) {
      try {
        await app.close();
      } catch {
        console.error("Place reels refresh command shutdown failed.");
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
