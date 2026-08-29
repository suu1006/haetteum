import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";

import type { ApiEnvironment } from "../config/environment.js";
import { KakaoAuthClient } from "./kakao-auth.client.js";

const kakaoToken = {
  token_type: "bearer",
  access_token: "provider-access-token",
  expires_in: 21_599,
  refresh_token: "provider-refresh-token",
  refresh_token_expires_in: 5_184_000,
  scope: "profile_nickname profile_image",
};

const kakaoUser = {
  id: 123_456_789,
  connected_at: "2026-08-26T12:00:00Z",
  properties: {
    nickname: "해뜸 여행자",
    profile_image: "https://cdn.example.test/properties-profile.jpg",
    thumbnail_image: "https://cdn.example.test/properties-thumbnail.jpg",
  },
  kakao_account: {
    profile_needs_agreement: false,
    profile: {
      nickname: "해뜸 여행자",
      thumbnail_image_url: "https://cdn.example.test/profile-thumbnail.jpg",
      profile_image_url: "https://cdn.example.test/profile.jpg",
      is_default_image: false,
      is_default_nickname: false,
    },
    has_email: false,
    email_needs_agreement: false,
    is_email_valid: false,
    is_email_verified: false,
  },
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createClient(fetch: typeof globalThis.fetch) {
  const config = {
    get: jest.fn((key: keyof ApiEnvironment) => {
      const values = {
        KAKAO_REST_API_KEY: "kakao-rest-test-key",
        KAKAO_CLIENT_SECRET: "kakao-client-secret-for-test",
        KAKAO_REDIRECT_URI: "http://localhost:4000/api/v1/auth/kakao/callback",
      } satisfies Pick<
        ApiEnvironment,
        "KAKAO_REST_API_KEY" | "KAKAO_CLIENT_SECRET" | "KAKAO_REDIRECT_URI"
      >;
      return values[key as keyof typeof values];
    }),
  } as unknown as ConfigService<ApiEnvironment, true>;

  return new KakaoAuthClient(config, fetch);
}

async function rejectedError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }

  throw new Error("Expected promise to reject");
}

function requestUrl(input: RequestInfo | URL | undefined): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;

  throw new Error("Expected fetch request input");
}

function formUrlEncodedBody(
  body: BodyInit | null | undefined,
): URLSearchParams {
  if (body instanceof URLSearchParams) return body;

  throw new Error("Expected URLSearchParams request body");
}

describe("KakaoAuthClient", () => {
  it("exchanges a code at the fixed token endpoint without exposing refresh data", async () => {
    const fetch = jest
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse(kakaoToken));
    const client = createClient(fetch);

    await expect(client.exchangeCode("authorization-code")).resolves.toBe(
      "provider-access-token",
    );

    const [input, init] = fetch.mock.calls[0] ?? [];
    expect(requestUrl(input)).toBe("https://kauth.kakao.com/oauth/token");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/x-www-form-urlencoded;charset=utf-8",
    );
    expect(formUrlEncodedBody(init?.body)).toEqual(
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "kakao-rest-test-key",
        client_secret: "kakao-client-secret-for-test",
        redirect_uri: "http://localhost:4000/api/v1/auth/kakao/callback",
        code: "authorization-code",
      }),
    );
  });

  it("maps only the documented Kakao identity fields", async () => {
    const fetch = jest
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse(kakaoUser));
    const client = createClient(fetch);

    await expect(client.getUser("provider-access-token")).resolves.toEqual({
      providerUserId: "123456789",
      displayName: "해뜸 여행자",
      profileImageUrl: "https://cdn.example.test/profile.jpg",
    });

    const [input, init] = fetch.mock.calls[0] ?? [];
    expect(requestUrl(input)).toBe("https://kapi.kakao.com/v2/user/me");
    expect(init?.method).toBe("GET");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer provider-access-token",
    );
    expect(init?.signal).toBeDefined();
  });

  it("upgrades an http Kakao CDN profile image URL to https", async () => {
    const fetch = jest.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ...kakaoUser,
        kakao_account: {
          ...kakaoUser.kakao_account,
          profile: {
            ...kakaoUser.kakao_account.profile,
            profile_image_url:
              "http://k.kakaocdn.net/dn/haGqj/abc/img_640x640.jpg",
          },
        },
      }),
    );
    const client = createClient(fetch);

    await expect(client.getUser("provider-access-token")).resolves.toEqual({
      providerUserId: "123456789",
      displayName: "해뜸 여행자",
      profileImageUrl: "https://k.kakaocdn.net/dn/haGqj/abc/img_640x640.jpg",
    });
  });

  it("leaves a non-Kakao-CDN http profile image URL untouched", async () => {
    const fetch = jest.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ...kakaoUser,
        kakao_account: {
          ...kakaoUser.kakao_account,
          profile: {
            ...kakaoUser.kakao_account.profile,
            profile_image_url: "http://cdn.example.test/profile.jpg",
          },
        },
      }),
    );
    const client = createClient(fetch);

    await expect(client.getUser("provider-access-token")).resolves.toEqual({
      providerUserId: "123456789",
      displayName: "해뜸 여행자",
      profileImageUrl: "http://cdn.example.test/profile.jpg",
    });
  });

  it("defaults an absent profile nickname and image", async () => {
    const fetch = jest.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ...kakaoUser,
        id: "provider-id",
        kakao_account: { ...kakaoUser.kakao_account, profile: {} },
      }),
    );
    const client = createClient(fetch);

    await expect(client.getUser("provider-access-token")).resolves.toEqual({
      providerUserId: "provider-id",
      displayName: "카카오 여행자",
      profileImageUrl: null,
    });
  });

  it.each([
    [
      "a non-success token response",
      () =>
        jsonResponse({ error_description: "provider-token-error-body" }, 401),
    ],
    [
      "a malformed token response",
      () => new Response("provider-token-error-body", { status: 200 }),
    ],
  ])(
    "rejects %s without leaking authorization data",
    async (_scenario, response) => {
      const fetch = jest
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(response());
      const client = createClient(fetch);

      const error = await rejectedError(
        client.exchangeCode("secret-authorization-code"),
      );

      expect(error.message).toContain("KAKAO_AUTH_");
      expect(error.message).not.toContain("secret-authorization-code");
      expect(error.message).not.toContain("provider-token-error-body");
    },
  );

  it.each([
    [
      "a non-success response",
      () => jsonResponse({ error: "provider-body" }, 401),
    ],
    ["malformed JSON", () => new Response("not-json", { status: 200 })],
    [
      "a user response without an id",
      () => jsonResponse({ ...kakaoUser, id: null }),
    ],
  ])(
    "rejects %s without leaking provider values",
    async (_scenario, response) => {
      const fetch = jest
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(response());
      const client = createClient(fetch);

      await expect(client.getUser("secret-access-token")).rejects.toThrow(
        "KAKAO_AUTH_",
      );
      await client.getUser("secret-access-token").catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain("secret-access-token");
        expect(message).not.toContain("provider-body");
        expect(message).not.toContain("해뜸 여행자");
      });
    },
  );

  it("converts an aborted provider request into a non-sensitive timeout error", async () => {
    const fetch = jest
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(
        new DOMException("token=secret-access-token", "TimeoutError"),
      );
    const client = createClient(fetch);

    await expect(
      client.exchangeCode("secret-authorization-code"),
    ).rejects.toThrow("KAKAO_AUTH_TIMEOUT");
    await client
      .exchangeCode("secret-authorization-code")
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain("secret-authorization-code");
        expect(message).not.toContain("secret-access-token");
      });
  });
});
