import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NestFactory } from "@nestjs/core";
import { TourApiRecoveryRepository } from "./tour-api-recovery.repository.js";
import { parseReplayArguments } from "./tourism-replay.command.js";

type InspectCommand = {
  job: "tourism" | "festival";
  ids: string[];
  limit: number;
};
export function parseInspectArguments(args: readonly string[]): InspectCommand {
  if (args.some((arg) => arg !== "--" && !/^--(job|ids|limit)=/.test(arg)))
    throw new Error("Invalid inspection arguments");
  const { job, ids, limit } = parseReplayArguments(args);
  return { job, ids, limit };
}
export async function executeInspect(
  command: InspectCommand,
  repository: Pick<TourApiRecoveryRepository, "inspectCurrent">,
  output: (value: string) => void,
): Promise<void> {
  const rows = await repository.inspectCurrent(
    command.job,
    command.ids,
    command.limit,
  );
  const items = rows
    .slice(0, command.limit)
    .filter(
      (row) =>
        row.job === command.job &&
        /^\d{1,20}$/.test(row.contentId) &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          row.sourceVersion,
        ) &&
        (row.state === "FAILED" || row.state === "QUARANTINED"),
    )
    .map((row) => ({
      job: command.job,
      contentId: row.contentId,
      sourceVersion: row.sourceVersion,
      state: row.state,
      stage:
        /^(detailCommon2|detailIntro2|detailInfo2|detailImage2|MAPPING|PERSISTENCE|RESPONSE|PROCESSING)$/.test(
          row.stage,
        )
          ? row.stage
          : "PROCESSING",
      code: /^(\d{2,4}|HTTP_\d{3}|P2\d{3}|INVALID_RESPONSE|EMPTY_RESPONSE|RESPONSE_TOO_LARGE|TIMEOUT|NETWORK_ERROR|PROCESSING_FAILED)$/.test(
        row.code,
      )
        ? row.code
        : "PROCESSING_FAILED",
      attemptCount:
        Number.isSafeInteger(row.attemptCount) && row.attemptCount >= 0
          ? row.attemptCount
          : null,
      nextAttemptAt:
        row.nextAttemptAt instanceof Date &&
        Number.isFinite(row.nextAttemptAt.getTime())
          ? row.nextAttemptAt.toISOString()
          : null,
    }));
  output(JSON.stringify({ job: command.job, count: items.length, items }));
}
async function run(): Promise<void> {
  process.env.SCHEDULERS_ENABLED = "false";
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;
  try {
    const command = parseInspectArguments(process.argv.slice(2));
    const { AppModule } = await import("../app.module.js");
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    await executeInspect(command, app.get(TourApiRecoveryRepository), (value) =>
      console.log(value),
    );
  } catch {
    console.error(
      "TourAPI inspection failed. Check arguments and recovery storage.",
    );
    process.exitCode = 1;
  } finally {
    try {
      await app?.close();
    } catch {
      console.error("TourAPI inspection shutdown failed.");
      process.exitCode = 1;
    }
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  void run();
