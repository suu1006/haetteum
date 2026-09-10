import { AuthUserSchema, ProblemDetailsSchema } from "@haetteum/contracts";

import type { AuthUser } from "@/features/auth/auth-model";

const loadCurrentUserError = "Unable to load current user.";
const logoutError = "Unable to log out.";
const genericLoginErrorMessage =
  "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";

export type EmailLoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<EmailLoginResult> {
  try {
    const response = await fetch(`${apiBaseUrl()}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const parsed = ProblemDetailsSchema.safeParse(await response.json());
      return {
        ok: false,
        message: parsed.success ? parsed.data.detail : genericLoginErrorMessage,
      };
    }

    const parsed = AuthUserSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { ok: false, message: genericLoginErrorMessage };
    }
    return { ok: true, user: parsed.data };
  } catch {
    return { ok: false, message: genericLoginErrorMessage };
  }
}

export async function loadCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${apiBaseUrl()}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(loadCurrentUserError);

    const parsed = AuthUserSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error(loadCurrentUserError);
    return parsed.data;
  } catch {
    throw new Error(loadCurrentUserError);
  }
}

export async function logout(): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (response.status !== 204) throw new Error(logoutError);
  } catch {
    throw new Error(logoutError);
  }
}

function apiBaseUrl(): string {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!baseUrl) throw new Error(loadCurrentUserError);
  return baseUrl;
}
