import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NestFactory } from "@nestjs/core";
import type { WeeklyRecommendationsService } from "./weekly-recommendations.service.js";
const phases = [
  "prepare",
  "validate",
  "publish",
  "repair",
  "bootstrap",
] as const;
export async function executeWeeklyCommand(
  service: WeeklyRecommendationsService,
  phase: string | undefined,
): Promise<void> {
  if (!phases.includes(phase as (typeof phases)[number]))
    throw new Error(
      "Usage: weekly-recommendations.command.js prepare|validate|publish|repair|bootstrap",
    );
  await service[phase as (typeof phases)[number]]();
}
async function run() {
  process.env.SCHEDULERS_ENABLED = "false";
  const { AppModule } = await import("../app.module.js");
  const { WeeklyRecommendationsService } =
    await import("./weekly-recommendations.service.js");
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    await executeWeeklyCommand(
      app.get(WeeklyRecommendationsService),
      process.argv[2],
    );
  } finally {
    await app.close();
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void run().catch(() => {
    console.error(
      "Weekly recommendation command failed; inspect structured batch logs.",
    );
    process.exitCode = 1;
  });
}
