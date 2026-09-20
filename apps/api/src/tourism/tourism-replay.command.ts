import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NestFactory } from "@nestjs/core";
import { TourApiPolicy, TourApiPolicyError } from "./tour-api-policy.js";
import {
  TourApiLocalMissingError,
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
          const ids = await recovery.failedIds(
            command.job,
            command.ids,
            command.limit,
            command.requeue,
          );
          const summary = {
            job: command.job,
            requestedCount: ids.length,
            succeededCount: 0,
            failedCount: 0,
            deferredCount: 0,
            requests: 0,
          };
          for (const id of ids) {
            try {
              if (command.job === "tourism")
                await tourism.enrichPlaceDetails(id);
              else await festival.enrichContentId(id);
              summary.succeededCount++;
            } catch (error) {
              if (error instanceof TourApiLocalMissingError)
                summary.deferredCount++;
              else if (error instanceof TourApiPolicyError) throw error;
              else summary.failedCount++;
            }
          }
          summary.requests = policy.currentBatchRequestCount();
          console.log(JSON.stringify(summary));
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
