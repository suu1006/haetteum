import { jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import type { Response } from "express";

import type { ApiEnvironment } from "../config/environment.js";
import { AuthCookieService } from "./auth-cookie.service.js";

const expiresAt = new Date("2026-09-09T12:00:00.000Z");

function createService(nodeEnv: ApiEnvironment["NODE_ENV"]) {
  const config = {
    get: jest.fn(() => nodeEnv),
  } as unknown as ConfigService<ApiEnvironment, true>;
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const response = {
    cookie,
    clearCookie,
  } as unknown as Response;

  return {
    service: new AuthCookieService(config),
    response,
    cookie,
    clearCookie,
  };
}

describe("AuthCookieService", () => {
  it("sets development session cookies as host-only HttpOnly Lax cookies", () => {
    const { service, response, cookie } = createService("development");

    service.setSession(response, "A".repeat(43), expiresAt);

    expect(service.sessionCookieName).toBe("haetteum_session");
    expect(cookie).toHaveBeenCalledWith(
      "haetteum_session",
      expect.any(String),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        expires: expiresAt,
      },
    );
  });

  it("uses __Host names and secure cookies in production", () => {
    const { service, response, cookie } = createService("production");

    service.setSession(response, "A".repeat(43), expiresAt);
    service.setOAuthState(response, "state-payload");

    expect(service.sessionCookieName).toBe("__Host-haetteum_session");
    expect(service.oauthStateCookieName).toBe("__Secure-haetteum_oauth_state");
    expect(cookie).toHaveBeenNthCalledWith(
      1,
      "__Host-haetteum_session",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        expires: expiresAt,
      }),
    );
    expect(cookie).toHaveBeenNthCalledWith(
      2,
      "__Secure-haetteum_oauth_state",
      "state-payload",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/api/v1/auth/kakao/callback",
      }),
    );
  });

  it("clears cookies with the same security and path attributes used to set them", () => {
    const { service, response, clearCookie } = createService("production");

    service.clearSession(response);
    service.clearOAuthState(response);

    expect(clearCookie).toHaveBeenNthCalledWith(1, "__Host-haetteum_session", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    expect(clearCookie).toHaveBeenNthCalledWith(
      2,
      "__Secure-haetteum_oauth_state",
      {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/api/v1/auth/kakao/callback",
      },
    );
  });
});
