import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NestFactory } from "@nestjs/core";
import {
  TourApiPolicy,
  TourApiPolicyError,
  TourApiBudgetDeferredError,
} from "./tour-api-policy.js";
import {
  TourApiLocalMissingError,
  TourApiRecoverySelectionChangedError,
  TourApiRecovery,
} from "./tour-api-recovery.js";
export type ReplayCommand = {
  job: "tourism" | "festival";
  ids: string[];
  limit: number;
  fetchMissing: boolean;
  maxRequests: number;
  requeue: boolean;
};
export function parseReplayArguments(args: readonly string[]): ReplayCommand {
  const values = new Map<string, string>();
  for (const arg of args) {
    if (arg === "--") continue;
    const match = /^--(job|ids|limit|max-requests)=(.+)$/.exec(arg);
    if (match) {
      if (values.has(match[1])) throw new Error("Invalid replay arguments");
      values.set(match[1], match[2]);
    } else if (arg === "--fetch-missing" || arg === "--requeue") {
      if (values.has(arg)) throw new Error("Invalid replay arguments");
      values.set(arg, "true");
    } else throw new Error("Invalid replay arguments");
  }
  const job = values.get("job");
  const ids = values.has("ids") ? values.get("ids")!.split(",") : [];
  const limit = boundedInteger(values.get("limit") ?? "20", 1, 100);
  const fetchMissing = values.has("--fetch-missing");
  const maxRequests = boundedInteger(values.get("max-requests") ?? "0", 0, 100);
  const requeue = values.has("--requeue");
  if (
    (job !== "tourism" && job !== "festival") ||
    ids.length > 100 ||
    ids.some((id) => !/^\d{1,20}$/.test(id)) ||
    new Set(ids).size !== ids.length ||
    fetchMissing !== maxRequests > 0 ||
    (requeue && ids.length === 0)
  )
    throw new Error("Invalid replay arguments");
  return { job, ids, limit, fetchMissing, maxRequests, requeue };
}
function boundedInteger(value: string, min: number, max: number): number {
  if (!/^\d+$/.test(value)) throw new Error("Invalid replay arguments");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max)
    throw new Error("Invalid replay arguments");
  return number;
}
export function safeReplayStopReason(error: unknown): string {
  if (
    error instanceof TourApiBudgetDeferredError &&
    [
      "TOUR_API_DAILY_LIMIT",
      "TOUR_API_JOB_DAILY_LIMIT",
      "TOUR_API_RECOVERY_WAIT",
      "TOUR_API_RETRY_DAILY_LIMIT",
      "TOUR_API_PROVIDER_COOLDOWN",
      "TOUR_API_BATCH_DEADLINE",
    ].includes(error.reason)
  )
    return error.reason;
  if (error instanceof TourApiLocalMissingError)
    return "TOUR_API_LOCAL_RESPONSE_MISSING";
  if (error instanceof TourApiRecoverySelectionChangedError)
    return "TOUR_API_RECOVERY_SELECTION_CHANGED";
  if (error instanceof TourApiPolicyError) return "BATCH_FAILED";
  return "PROCESSING_FAILED";
}
async function run(): Promise<void> {
  process.env.SCHEDULERS_ENABLED = "false";
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;
  try {
    const command = parseReplayArguments(process.argv.slice(2));
    const [{ AppModule }, { TourismSyncService }, { FestivalSyncService }] =
      await Promise.all([
        import("../app.module.js"),
        import("./tourism-sync.service.js"),
        import("./festival-sync.service.js"),
      ]);
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const recovery = app.get(TourApiRecovery);
    const policy = app.get(TourApiPolicy);
    const tourism = app.get(TourismSyncService);
    const festival = app.get(FestivalSyncService);
    await policy.batch(
      () =>
        recovery.local(command, async () => {
          const items = await recovery.failedItems(
            command.job,
            command.ids,
            command.limit,
            command.requeue,
          );
          const summary = {
            job: command.job,
            requestedCount: items.length,
            succeededCount: 0,
            failedCount: 0,
            deferredCount: 0,
            requests: 0,
            locallyReplayedCount: 0,
            stopReason: null as string | null,
          };
          try {
            for (const item of items) {
              try {
                if (command.job === "tourism")
                  await recovery.observeReplay(summary, () =>
                    tourism.enrichPlaceDetails(
                      item.contentId,
                      item.sourceVersion,
                    ),
                  );
                else
                  await recovery.observeReplay(summary, () =>
                    festival.enrichContentId(
                      item.contentId,
                      item.sourceVersion,
                    ),
                  );
                summary.succeededCount++;
              } catch (error) {
                summary.stopReason = safeReplayStopReason(error);
                if (
                  error instanceof TourApiBudgetDeferredError &&
                  error.reason === "TOUR_API_BATCH_DEADLINE"
                ) {
                  summary.deferredCount =
                    items.length - summary.succeededCount - summary.failedCount;
                  break;
                }
                if (
                  (error instanceof TourApiBudgetDeferredError &&
                    error.reason !== "TOUR_API_BATCH_DEADLINE") ||
                  error instanceof TourApiLocalMissingError ||
                  error instanceof TourApiRecoverySelectionChangedError
                )
                  summary.deferredCount++;
                else if (error instanceof TourApiPolicyError) throw error;
                else summary.failedCount++;
              }
            }
          } finally {
            summary.requests = policy.currentBatchRequestCount();
            console.log(
              JSON.stringify({
                ...summary,
                remainingCount: summary.requestedCount - summary.succeededCount,
              }),
            );
          }
          process.exitCode = summary.failedCount
            ? 1
            : summary.deferredCount
              ? 2
              : 0;
        }),
      command.job,
    );
  } catch {
    console.error(
      "TourAPI replay failed. Check arguments, batch policy, and recovery storage.",
    );
    process.exitCode = 1;
  } finally {
    await app?.close();
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  void run();
