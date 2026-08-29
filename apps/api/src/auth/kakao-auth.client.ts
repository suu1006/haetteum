import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

import type { ApiEnvironment } from "../config/environment.js";
import { KAKAO_AUTH_FETCH } from "./auth.constants.js";
import type { KakaoIdentity } from "./auth.types.js";

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_USER_URL = "https://kapi.kakao.com/v2/user/me";
const KAKAO_AUTH_TIMEOUT_MS = 5_000;

const tokenResponseSchema = z.object({
  access_token: z.string().trim().min(1),
});

const userResponseSchema = z.object({
  id: z.union([z.string().trim().min(1), z.number().int().nonnegative()]),
  kakao_account: z
    .object({
      profile: z
        .object({
          nickname: z.string().optional(),
          profile_image_url: z.string().url().optional(),
        })
        .optional(),
    })
    .optional(),
});

export class KakaoAuthError extends Error {
  constructor(code: string) {
    super(`KAKAO_AUTH_${code}`);
  }
}

// Kakao returns profile image URLs over http even though the Kakao CDN serves the
// same asset over https. Upgrade the scheme so downstream https-only consumers
// (next/image remotePatterns, isAllowedKakaoProfileImageUrl) accept it.
function normalizeKakaoProfileImageUrl(
  rawUrl: string | undefined,
): string | null {
  if (!rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const isKakaoCdn =
    url.hostname === "kakaocdn.net" || url.hostname.endsWith(".kakaocdn.net");
  if (isKakaoCdn && url.protocol === "http:") {
    url.protocol = "https:";
  }

  return url.toString();
}

@Injectable()
export class KakaoAuthClient {
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(KAKAO_AUTH_FETCH) private readonly fetch: typeof globalThis.fetch,
  ) {}

  async exchangeCode(code: string): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.get("KAKAO_REST_API_KEY", { infer: true }),
      client_secret: this.config.get("KAKAO_CLIENT_SECRET", { infer: true }),
      redirect_uri: this.config.get("KAKAO_REDIRECT_URI", { infer: true }),
      code,
    });
    const token = await this.request(
      KAKAO_TOKEN_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body,
      },
      tokenResponseSchema,
    );

    return token.access_token;
  }

  async getUser(accessToken: string): Promise<KakaoIdentity> {
    const user = await this.request(
      KAKAO_USER_URL,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      userResponseSchema,
    );
    const profile = user.kakao_account?.profile;
    const displayName = profile?.nickname?.trim() || "카카오 여행자";

    return {
      providerUserId: String(user.id),
      displayName,
      profileImageUrl: normalizeKakaoProfileImageUrl(
        profile?.profile_image_url,
      ),
    };
  }

  private async request<T extends z.ZodType>(
    url: string,
    init: RequestInit,
    schema: T,
  ): Promise<z.infer<T>> {
    try {
      const response = await this.fetch(url, {
        ...init,
        signal: AbortSignal.timeout(KAKAO_AUTH_TIMEOUT_MS),
      });
      if (!response.ok) throw new KakaoAuthError(`HTTP_${response.status}`);

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new KakaoAuthError("INVALID_RESPONSE");
      }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) throw new KakaoAuthError("INVALID_RESPONSE");

      return parsed.data;
    } catch (error) {
      if (error instanceof KakaoAuthError) throw error;
      if (
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new KakaoAuthError("TIMEOUT");
      }
      throw new KakaoAuthError("NETWORK_ERROR");
    }
  }
}
