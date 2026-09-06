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
    KAKAO_REST_API_KEY: z.string().trim().min(1),
    KAKAO_CLIENT_SECRET: z.string().trim().min(1),
    KAKAO_REDIRECT_URI: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().url().optional(),
    ),
    TOURISM_SYNC_ENABLED: booleanFromString,
    YOUTUBE_API_KEY: providerSecret,
    PLACE_REELS_ENABLED: booleanFromString,
  })
  .superRefine((value, context) => {
    if (value.PLACE_REELS_ENABLED && !value.YOUTUBE_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["YOUTUBE_API_KEY"],
        message: "YOUTUBE_API_KEY is required when place reels are enabled",
      });
    }

    if (value.TOURISM_SYNC_ENABLED) {
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
    }

    if (value.KAKAO_REDIRECT_URI) {
      let redirectUri: URL;

      try {
        redirectUri = new URL(value.KAKAO_REDIRECT_URI);
      } catch {
        return;
      }

      const isLocalhost =
        redirectUri.hostname === "localhost" ||
        redirectUri.hostname === "127.0.0.1";
      const allowsLocalhostHttp =
        (value.NODE_ENV === "development" || value.NODE_ENV === "test") &&
        isLocalhost;

      if (redirectUri.pathname !== "/api/v1/auth/kakao/callback") {
        context.addIssue({
          code: "custom",
          path: ["KAKAO_REDIRECT_URI"],
          message: "KAKAO_REDIRECT_URI must use /api/v1/auth/kakao/callback",
        });
      }

      if (
        redirectUri.protocol !== "https:" &&
        !(allowsLocalhostHttp && redirectUri.protocol === "http:")
      ) {
        context.addIssue({
          code: "custom",
          path: ["KAKAO_REDIRECT_URI"],
          message:
            "KAKAO_REDIRECT_URI must use HTTPS unless it targets localhost",
        });
      }
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
