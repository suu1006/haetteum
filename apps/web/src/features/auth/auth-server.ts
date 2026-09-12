import "server-only";

import { AuthUserSchema } from "@haetteum/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeReturnTo, type AuthUser } from "@/features/auth/auth-model";
import { getApiBaseUrl } from "@/lib/api-base";

const loadCurrentUserError = "Unable to load current user.";

export async function loadCurrentUser(): Promise<AuthUser | null> {
  const baseUrl = apiBaseUrl();
  const cookie = (await headers()).get("cookie");
  try {
    const response = await fetch(`${baseUrl}/auth/me`, {
      cache: "no-store",
      headers: cookie ? { Cookie: cookie } : {},
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

export async function requireCurrentUser(returnTo: string): Promise<AuthUser> {
  const user = await loadCurrentUser();
  if (user) return user;

  redirect(`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

function apiBaseUrl(): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error(loadCurrentUserError);
  return baseUrl;
}
