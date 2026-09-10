import {
  EmailSignupStartResponseSchema,
  EmailSignupVerifyResponseSchema,
  ProblemDetailsSchema,
  type AuthUser,
} from "@haetteum/contracts";

const genericErrorMessage = "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

export type EmailAuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export async function startEmailSignup(
  email: string,
  password: string,
): Promise<EmailAuthResult<{ codeExpiresAt: string }>> {
  return postJson(
    "/auth/signup/start",
    { email, password },
    EmailSignupStartResponseSchema,
  );
}

export async function verifyEmailSignupCode(
  email: string,
  code: string,
): Promise<EmailAuthResult<{ verified: true; user: AuthUser }>> {
  return postJson(
    "/auth/signup/verify-code",
    { email, code },
    EmailSignupVerifyResponseSchema,
  );
}

async function postJson<T>(
  path: string,
  body: unknown,
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
): Promise<EmailAuthResult<T>> {
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { ok: false, message: await errorMessage(response) };
    }

    const parsed = schema.safeParse(await response.json());
    if (!parsed.success || parsed.data === undefined) {
      return { ok: false, message: genericErrorMessage };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, message: genericErrorMessage };
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const parsed = ProblemDetailsSchema.safeParse(await response.json());
    if (parsed.success) return parsed.data.detail;
  } catch {
    // response body wasn't JSON problem details; fall through to the generic message
  }
  return genericErrorMessage;
}

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
}
