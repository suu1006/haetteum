import type { Metadata } from "next";
import { headers } from "next/headers";

import { LoginScreen } from "@/components/patterns/login-screen";
import {
  loginErrorMessage,
  safeReturnTo,
} from "@/features/auth/auth-model";

export const metadata: Metadata = {
  title: "로그인 | 해뜸",
  description: "카카오 계정으로 로그인하고 여행 기록을 이어서 관리하세요.",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    returnTo?: string | string[];
  }>;
};

function kakaoLoginHref(returnTo: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const query = new URLSearchParams({ returnTo });
  return `${baseUrl}/auth/kakao/start?${query.toString()}`;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const requestHeaders = await headers();
  const returnTo = safeReturnTo(query.returnTo);
  const error = typeof query.error === "string" ? query.error : undefined;

  return (
    <LoginScreen
      canGoBack={hasSameOriginReferrer(requestHeaders)}
      errorMessage={loginErrorMessage(error)}
      loginHref={kakaoLoginHref(returnTo)}
    />
  );
}

function hasSameOriginReferrer(requestHeaders: {
  get(name: string): string | null;
}): boolean {
  const host = requestHeaders.get("host")?.trim().toLowerCase();
  const referer = requestHeaders.get("referer");
  if (!host || !referer) return false;

  try {
    const refererUrl = new URL(referer);
    return (
      (refererUrl.protocol === "http:" || refererUrl.protocol === "https:") &&
      refererUrl.username === "" &&
      refererUrl.password === "" &&
      refererUrl.host.toLowerCase() === host
    );
  } catch {
    return false;
  }
}

export { hasSameOriginReferrer, kakaoLoginHref };
