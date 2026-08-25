import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NestFactory } from "@nestjs/core";

import type { TourismSyncService } from "./tourism-sync.service.js";

const USAGE = [
  "Usage:",
  "  pnpm tourism:sync -- --mode=full",
  "  pnpm tourism:sync -- --mode=incremental",
  "  pnpm tourism:enrich -- --content-id=2704412",
].join("\n");

type SyncCommand =
  | { mode: "full" }
  | { mode: "incremental" }
  | { mode: "enrich"; contentId: string };

class UsageError extends Error {
  constructor() {
    super("Invalid tourism sync arguments.");
  }
}

export function parseCommandArguments(args: readonly string[]): SyncCommand {
  let mode: string | undefined;
  let contentId: string | undefined;
  let separatorSeen = false;

  for (const arg of args) {
    if (arg === "--") {
      if (separatorSeen) throw new UsageError();
      separatorSeen = true;
      continue;
    }

    if (arg.startsWith("--mode=")) {
      if (mode !== undefined) throw new UsageError();
      mode = arg.slice("--mode=".length);
      continue;
    }

    if (arg.startsWith("--content-id=")) {
      if (contentId !== undefined) throw new UsageError();
      contentId = arg.slice("--content-id=".length);
      continue;
    }

    throw new UsageError();
  }

  if (mode === "full" || mode === "incremental") {
    if (contentId !== undefined) throw new UsageError();
    return { mode };
  }

  if (mode === "enrich" && contentId !== undefined && /^\d+$/.test(contentId)) {
    return { mode, contentId };
  }

  throw new UsageError();
}

function printSummary(
  operation: SyncCommand["mode"],
  summary: Awaited<ReturnType<TourismSyncService["fullSync"]>>,
): void {
  console.log(
    JSON.stringify({
      operation,
      result: summary.status,
      runId: summary.runId,
      fetchedCount: summary.fetchedCount,
      insertedCount: summary.insertedCount,
      updatedCount: summary.updatedCount,
      deactivatedCount: summary.deactivatedCount,
      failedCount: summary.failedCount,
    }),
  );
}

async function run(): Promise<void> {
  let command: SyncCommand;

  try {
    command = parseCommandArguments(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`${error.message}\n${USAGE}`);
    } else {
      console.error(USAGE);
    }
    process.exitCode = 1;
    return;
  }

  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    const [{ AppModule }, { TourismSyncService }] = await Promise.all([
      import("../app.module.js"),
      import("./tourism-sync.service.js"),
    ]);
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const sync = app.get(TourismSyncService);

    if (command.mode === "full") {
      printSummary("full", await sync.fullSync());
      return;
    }

    if (command.mode === "incremental") {
      printSummary("incremental", await sync.incrementalSync());
      return;
    }

    await sync.enrichPlace(command.contentId);
    console.log(
      JSON.stringify({
        operation: "enrich",
        result: "SUCCEEDED",
        contentId: command.contentId,
      }),
    );
  } catch {
    console.error("Tourism sync command failed.");
    process.exitCode = 1;
  } finally {
    if (app != null) {
      try {
        await app.close();
      } catch {
        console.error("Tourism sync command shutdown failed.");
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
