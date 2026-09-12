import { TourApiPolicy } from "../tourism/tour-api-policy.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NestFactory } from "@nestjs/core";

import type { CourseSyncService } from "./course-sync.service.js";

type CommandOutput = (message: string) => void;
type CourseSyncRunner = Pick<CourseSyncService, "syncCourses">;

export async function executeCourseSync(
  service: CourseSyncRunner,
  argv: string[],
  output: CommandOutput,
  errorOutput: CommandOutput,
): Promise<number> {
  try {
    const summary = await service.syncCourses({ limit: parseLimitArg(argv) });
    output(JSON.stringify(summary));
    return 0;
  } catch {
    errorOutput("Course sync command failed.");
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

function parseLimitArg(argv: string[]): number | undefined {
  const value = readArg(argv, "limit");
  if (value === undefined) return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 2000) {
    throw new Error(`Invalid limit: ${value}`);
  }
  return limit;
}

async function run(): Promise<void> {
  process.env.SCHEDULERS_ENABLED = "false";
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    const [{ AppModule }, { CourseSyncService }] = await Promise.all([
      import("../app.module.js"),
      import("./course-sync.service.js"),
    ]);
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ["error", "warn"],
    });
    const service = app.get(CourseSyncService);
    const exitCode = await app.get(TourApiPolicy).batch(() =>
      executeCourseSync(
        service,
        process.argv.slice(2),
        (message) => console.log(message),
        (message) => console.error(message),
      ),
    );
    if (exitCode !== 0) process.exitCode = exitCode;
  } catch {
    console.error("Course sync command failed.");
    process.exitCode = 1;
  } finally {
    if (app != null) {
      try {
        await app.close();
      } catch {
        console.error("Course sync command shutdown failed.");
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
