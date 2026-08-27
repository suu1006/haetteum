import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Response } from "express";

import type { ApiEnvironment } from "../config/environment.js";
import { OAUTH_STATE_TTL_MS } from "./auth.constants.js";

const OAUTH_CALLBACK_PATH = "/api/v1/auth/kakao/callback";

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService<ApiEnvironment, true>) {}

  get sessionCookieName(): string {
    return this.isProduction ? "__Host-haetteum_session" : "haetteum_session";
  }

  get oauthStateCookieName(): string {
    return this.isProduction
      ? "__Secure-haetteum_oauth_state"
      : "haetteum_oauth_state";
  }

  setSession(response: Response, sessionToken: string, expiresAt: Date): void {
    response.cookie(this.sessionCookieName, sessionToken, {
      ...this.sessionOptions(),
      expires: expiresAt,
    });
  }

  clearSession(response: Response): void {
    response.clearCookie(this.sessionCookieName, this.sessionOptions());
  }

  setOAuthState(response: Response, value: string): void {
    response.cookie(this.oauthStateCookieName, value, {
      ...this.oauthStateOptions(),
      maxAge: OAUTH_STATE_TTL_MS,
    });
  }

  clearOAuthState(response: Response): void {
    response.clearCookie(this.oauthStateCookieName, this.oauthStateOptions());
  }

  private get isProduction(): boolean {
    return this.config.get("NODE_ENV", { infer: true }) === "production";
  }

  private sessionOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.isProduction,
      path: "/",
    };
  }

  private oauthStateOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.isProduction,
      path: OAUTH_CALLBACK_PATH,
    };
  }
}
