import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const providerEndpoint = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .url()
    .refine(
      (value) => {
        const endpoint = new URL(value);

        return (
          endpoint.protocol === "https:" &&
          endpoint.hostname === "apis.data.go.kr" &&
          endpoint.pathname.replace(/\/+$/, "") === "/B551011/KorService2"
        );
      },
      { message: "END_POINT must be the approved HTTPS KorService2 URL" },
    )
    .optional(),
);

const providerSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const ApiEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    API_PORT: z.coerce.number().int().min(1).max(65535),
    WEB_ORIGIN: z.string().url(),
    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => value.startsWith("postgresql://"), {
        message: "DATABASE_URL must use postgresql://",
      }),
    END_POINT: providerEndpoint,
    SERVICE_KEY: providerSecret,
    TOURISM_SYNC_ENABLED: booleanFromString,
  })
  .superRefine((value, context) => {
    if (!value.TOURISM_SYNC_ENABLED) return;

    if (!value.END_POINT) {
      context.addIssue({
        code: "custom",
        path: ["END_POINT"],
        message: "END_POINT is required when tourism sync is enabled",
      });
    }

    if (!value.SERVICE_KEY) {
      context.addIssue({
        code: "custom",
        path: ["SERVICE_KEY"],
        message: "SERVICE_KEY is required when tourism sync is enabled",
      });
    }
  });

export type ApiEnvironment = z.infer<typeof ApiEnvironmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): ApiEnvironment {
  const result = ApiEnvironmentSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Invalid API environment:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
