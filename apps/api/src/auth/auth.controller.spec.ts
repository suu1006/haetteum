import type { AuthUser } from "@haetteum/contracts";
import { RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  RESPONSE_PASSTHROUGH_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import type { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";
import type { Request, Response } from "express";

import type { ApiEnvironment } from "../config/environment.js";
import type { AuthCookieService } from "./auth-cookie.service.js";
import { AuthController } from "./auth.controller.js";
import type { AuthService } from "./auth.service.js";
import type { OAuthStateService } from "./oauth-state.service.js";
import { SameOriginGuard } from "./same-origin.guard.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import type { SessionService } from "./session.service.js";

const user: AuthUser = {
  id: "10000000-0000-4000-8000-000000000001",
  displayName: "해뜸 여행자",
  profileImageUrl: "https://cdn.example.test/profile.jpg",
};
const expiresAt = new Date("2026-09-09T12:00:00.000Z");
const oauthAttempt = {
  state: "S".repeat(43),
  cookieValue: "oauth-cookie-value",
};

function handler(method: keyof AuthController): (...args: never[]) => unknown {
  return Object.getOwnPropertyDescriptor(AuthController.prototype, method)
    ?.value as (...args: never[]) => unknown;
}

function createController(options?: {
  consumeError?: Error;
  loginError?: Error;
  revokeError?: Error;
  completedUser?: AuthUser;
  stateReturnTo?: string;
  kakaoRedirectUri?: string | undefined;
}) {
  const configValues = {
    WEB_ORIGIN: "http://localhost:3000",
    KAKAO_REST_API_KEY: "kakao-rest-test-key",
    KAKAO_REDIRECT_URI:
      "kakaoRedirectUri" in (options ?? {})
        ? options?.kakaoRedirectUri
        : "http://localhost:4000/api/v1/auth/kakao/callback",
  };
  const config = {
    get: jest.fn(
      (key: keyof ApiEnvironment) =>
        configValues[key as keyof typeof configValues],
    ),
  } as unknown as ConfigService<ApiEnvironment, true>;
  const createState = jest.fn().mockReturnValue(oauthAttempt);
  const consumeState = options?.consumeError
    ? jest.fn().mockImplementation(() => {
        throw options.consumeError ?? new Error("Expected consume failure");
      })
    : jest.fn().mockReturnValue({
        returnTo: options?.stateReturnTo ?? "/reviews?tab=written",
      });
  const oauthState = {
    create: createState,
    consume: consumeState,
  } as unknown as OAuthStateService;
  const completeKakaoLogin = options?.loginError
    ? jest.fn().mockRejectedValue(options.loginError)
    : jest.fn().mockResolvedValue({
        user: options?.completedUser ?? user,
        sessionToken: "A".repeat(43),
        expiresAt,
      });
  const auth = { completeKakaoLogin } as unknown as AuthService;
  const setOAuthState = jest.fn();
  const clearOAuthState = jest.fn();
  const setSession = jest.fn();
  const clearSession = jest.fn();
  const cookies = {
    oauthStateCookieName: "haetteum_oauth_state",
    setOAuthState,
    clearOAuthState,
    setSession,
    clearSession,
  } as unknown as AuthCookieService;
  const revoke = options?.revokeError
    ? jest.fn().mockRejectedValue(options.revokeError)
    : jest.fn().mockResolvedValue(undefined);
  const sessions = { revoke } as unknown as SessionService;
  const redirect = jest.fn();
  const response = { redirect } as unknown as Response;

  return {
    controller: new AuthController(config, oauthState, auth, cookies, sessions),
    response,
    redirect,
    createState,
    consumeState,
    completeKakaoLogin,
    setOAuthState,
    clearOAuthState,
    setSession,
    clearSession,
    revoke,
  };
}

describe("AuthController", () => {
  it("starts login with an exact Kakao authorization URL and callback-scoped state cookie", () => {
    const { controller, response, redirect, createState, setOAuthState } =
      createController();

    controller.start("/reviews?tab=written", response);

    expect(createState).toHaveBeenCalledWith("/reviews?tab=written");
    expect(setOAuthState).toHaveBeenCalledWith(response, "oauth-cookie-value");
    const location = new URL(redirect.mock.calls[0]?.[0] as string);
    expect(location.origin + location.pathname).toBe(
      "https://kauth.kakao.com/oauth/authorize",
    );
    expect(Object.fromEntries(location.searchParams)).toEqual({
      response_type: "code",
      client_id: "kakao-rest-test-key",
      redirect_uri: "http://localhost:4000/api/v1/auth/kakao/callback",
      state: "S".repeat(43),
    });
  });

  it("redirects to a provider-unavailable login error when no redirect URI is configured", () => {
    const { controller, response, redirect, createState } = createController({
      kakaoRedirectUri: undefined,
    });

    controller.start("/reviews?tab=written", response);

    expect(createState).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:3000/login?error=provider_unavailable",
    );
  });

  it("completes a matching callback, issues the Haetteum cookie, and redirects to the validated web path", async () => {
    const {
      controller,
      response,
      redirect,
      consumeState,
      completeKakaoLogin,
      clearOAuthState,
      setSession,
    } = createController();
    const request = {
      cookies: { haetteum_oauth_state: "oauth-cookie-value" },
    } as Request;

    await controller.callback(
      "authorization-code",
      "S".repeat(43),
      undefined,
      request,
      response,
    );

    expect(clearOAuthState).toHaveBeenCalledWith(response);
    expect(consumeState).toHaveBeenCalledWith(
      "S".repeat(43),
      "oauth-cookie-value",
    );
    expect(completeKakaoLogin).toHaveBeenCalledWith("authorization-code");
    expect(setSession).toHaveBeenCalledWith(
      response,
      "A".repeat(43),
      expiresAt,
    );
    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:3000/reviews?tab=written",
    );
  });

  it("clears state and redirects a Kakao denial to the cancelled login screen", async () => {
    const {
      controller,
      response,
      redirect,
      consumeState,
      completeKakaoLogin,
      clearOAuthState,
    } = createController();

    await controller.callback(
      undefined,
      "S".repeat(43),
      "access_denied",
      { cookies: {} } as Request,
      response,
    );

    expect(clearOAuthState).toHaveBeenCalledWith(response);
    expect(consumeState).not.toHaveBeenCalled();
    expect(completeKakaoLogin).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:3000/login?error=cancelled",
    );
  });

  it.each(["server_error", "temporarily_unavailable", "unexpected_error"])(
    "maps the non-denial provider error %s to provider_unavailable",
    async (providerError) => {
      const {
        controller,
        response,
        redirect,
        consumeState,
        completeKakaoLogin,
        clearOAuthState,
      } = createController();

      await controller.callback(
        undefined,
        "S".repeat(43),
        providerError,
        { cookies: {} } as Request,
        response,
      );

      expect(clearOAuthState).toHaveBeenCalledWith(response);
      expect(consumeState).not.toHaveBeenCalled();
      expect(completeKakaoLogin).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(
        "http://localhost:3000/login?error=provider_unavailable",
      );
    },
  );

  it.each(["https://evil.example/steal", "//evil.example/steal"])(
    "falls back to the configured web root when state resolves off-origin (%s)",
    async (stateReturnTo) => {
      const { controller, response, redirect } = createController({
        stateReturnTo,
      });

      await controller.callback(
        "authorization-code",
        "S".repeat(43),
        undefined,
        { cookies: { haetteum_oauth_state: "state-cookie" } } as Request,
        response,
      );

      expect(redirect).toHaveBeenCalledWith("http://localhost:3000/");
    },
  );

  it("clears state and rejects an invalid callback before code exchange", async () => {
    const {
      controller,
      response,
      redirect,
      completeKakaoLogin,
      clearOAuthState,
      setSession,
    } = createController({ consumeError: new Error("OAUTH_STATE_INVALID") });

    await controller.callback(
      "authorization-code",
      "wrong-state",
      undefined,
      { cookies: { haetteum_oauth_state: "state-cookie" } } as Request,
      response,
    );

    expect(clearOAuthState).toHaveBeenCalledWith(response);
    expect(completeKakaoLogin).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:3000/login?error=invalid_request",
    );
  });

  it("redirects a provider or database failure without issuing a session cookie", async () => {
    const { controller, response, redirect, clearOAuthState, setSession } =
      createController({ loginError: new Error("AUTH_LOGIN_FAILED") });

    await controller.callback(
      "authorization-code",
      "S".repeat(43),
      undefined,
      { cookies: { haetteum_oauth_state: "state-cookie" } } as Request,
      response,
    );

    expect(clearOAuthState).toHaveBeenCalledWith(response);
    expect(setSession).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:3000/login?error=provider_unavailable",
    );
  });

  it("parses /me through AuthUserSchema so private or malformed fields do not escape", () => {
    const { controller } = createController();

    expect(
      controller.me({
        ...user,
        providerUserId: "private-provider-id",
      } as AuthUser),
    ).toEqual(user);
    expect(() => controller.me({ ...user, id: "not-a-uuid" })).toThrow();
  });

  it("revokes the guarded raw token before clearing it on logout", async () => {
    const { controller, response, revoke, clearSession } = createController();
    const request = {
      auth: { sessionToken: "A".repeat(43), user },
    } as never;

    await expect(controller.logout(request, response)).resolves.toBeUndefined();

    expect(revoke).toHaveBeenCalledWith("A".repeat(43));
    expect(clearSession).toHaveBeenCalledWith(response);
    expect(revoke.mock.invocationCallOrder[0]).toBeLessThan(
      clearSession.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("does not clear the browser cookie when session revocation fails", async () => {
    const { controller, response, clearSession } = createController({
      revokeError: new Error("DATABASE_URL=secret"),
    });

    await expect(
      controller.logout(
        { auth: { sessionToken: "A".repeat(43), user } } as never,
        response,
      ),
    ).rejects.toThrow("DATABASE_URL=secret");
    expect(clearSession).not.toHaveBeenCalled();
  });

  it("registers exact versioned routes, guards, status codes, and response ownership", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe("auth");
    expect(Reflect.getMetadata(VERSION_METADATA, AuthController)).toBe("1");

    expect(Reflect.getMetadata(PATH_METADATA, handler("start"))).toBe(
      "kakao/start",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("start"))).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("start"))).toBe(302);
    expect(
      Reflect.getMetadata(
        RESPONSE_PASSTHROUGH_METADATA,
        AuthController,
        "start",
      ),
    ).toBeUndefined();

    expect(Reflect.getMetadata(PATH_METADATA, handler("callback"))).toBe(
      "kakao/callback",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("callback"))).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("callback"))).toBe(
      302,
    );
    expect(
      Reflect.getMetadata(
        RESPONSE_PASSTHROUGH_METADATA,
        AuthController,
        "callback",
      ),
    ).toBeUndefined();

    expect(Reflect.getMetadata(PATH_METADATA, handler("me"))).toBe("me");
    expect(Reflect.getMetadata(METHOD_METADATA, handler("me"))).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler("me"))).toEqual([
      SessionAuthGuard,
    ]);

    expect(Reflect.getMetadata(PATH_METADATA, handler("logout"))).toBe(
      "logout",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("logout"))).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("logout"))).toBe(
      204,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler("logout"))).toEqual([
      SessionAuthGuard,
      SameOriginGuard,
    ]);
    expect(
      Reflect.getMetadata(
        RESPONSE_PASSTHROUGH_METADATA,
        AuthController,
        "logout",
      ),
    ).toBe(true);
  });
});
