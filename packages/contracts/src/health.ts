import { z } from "zod";

const HealthIndicatorSchema = z
  .object({ status: z.enum(["up", "down"]) })
  .catchall(z.unknown());

const HealthIndicatorResultSchema = z.record(
  z.string(),
  HealthIndicatorSchema,
);

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "error", "shutting_down"]),
  info: HealthIndicatorResultSchema,
  error: HealthIndicatorResultSchema,
  details: HealthIndicatorResultSchema,
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
