import { AuthUserSchema, type AuthUser } from "@haetteum/contracts";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";

import type { ApiEnvironment } from "../config/environment.js";
import { AuthCookieService } from "./auth-cookie.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { OAuthStateService } from "./oauth-state.service.js";
import { SameOriginGuard } from "./same-origin.guard.js";
import {
  SessionAuthGuard,
  type AuthenticatedRequest,
} from "./session-auth.guard.js";
import { SessionService } from "./session.service.js";
import { AuthService } from "./auth.service.js";

const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";

@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly oauthState: OAuthStateService,
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
    private readonly sessions: SessionService,
  ) {}

  @Get("kakao/start")
  @HttpCode(HttpStatus.FOUND)
  start(
    @Query("returnTo") returnTo: string | undefined,
    @Res() response: Response,
  ): void {
    const attempt = this.oauthState.create(returnTo);
    const location = new URL(KAKAO_AUTHORIZE_URL);
    location.search = new URLSearchParams({
      response_type: "code",
      client_id: this.config.get("KAKAO_REST_API_KEY", { infer: true }),
      redirect_uri: this.config.get("KAKAO_REDIRECT_URI", { infer: true }),
      state: attempt.state,
    }).toString();

    this.cookies.setOAuthState(response, attempt.cookieValue);
    response.redirect(location.href);
  }

  @Get("kakao/callback")
  @HttpCode(HttpStatus.FOUND)
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") providerError: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    this.cookies.clearOAuthState(response);

    if (typeof providerError === "string" && providerError.length > 0) {
      const error =
        providerError === "access_denied"
          ? "cancelled"
          : "provider_unavailable";
      response.redirect(this.webLocation(`/login?error=${error}`));
      return;
    }

    let returnTo: string;
    try {
      const stateCookie = this.requestCookie(
        request,
        this.cookies.oauthStateCookieName,
      );
      returnTo = this.oauthState.consume(state, stateCookie).returnTo;
    } catch {
      response.redirect(this.webLocation("/login?error=invalid_request"));
      return;
    }

    if (typeof code !== "string" || code.length === 0) {
      response.redirect(this.webLocation("/login?error=invalid_request"));
      return;
    }

    try {
      const completed = await this.auth.completeKakaoLogin(code);
      this.cookies.setSession(
        response,
        completed.sessionToken,
        completed.expiresAt,
      );
      response.redirect(this.webLocation(returnTo));
    } catch {
      response.redirect(this.webLocation("/login?error=provider_unavailable"));
    }
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return AuthUserSchema.parse(user);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard, SameOriginGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const sessionToken = request.auth?.sessionToken;
    if (!sessionToken) {
      throw new UnauthorizedException({
        code: "UNAUTHENTICATED",
        detail: "로그인이 필요합니다.",
      });
    }

    await this.sessions.revoke(sessionToken);
    this.cookies.clearSession(response);
  }

  private requestCookie(request: Request, name: string): string | undefined {
    const requestCookies: unknown = request.cookies;
    if (typeof requestCookies !== "object" || requestCookies === null) {
      return undefined;
    }

    const value = (requestCookies as Record<string, unknown>)[name];
    return typeof value === "string" ? value : undefined;
  }

  private webLocation(path: string): string {
    const configuredOrigin = new URL(
      this.config.get("WEB_ORIGIN", { infer: true }),
    ).origin;
    const fallback = new URL("/", configuredOrigin).href;

    try {
      const location = new URL(path, configuredOrigin);
      return location.origin === configuredOrigin ? location.href : fallback;
    } catch {
      return fallback;
    }
  }
}
