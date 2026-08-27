import type { AuthUser } from "@haetteum/contracts";
import {
  CanActivate,
  Injectable,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { AuthCookieService } from "./auth-cookie.service.js";
import { SessionService } from "./session.service.js";

export type AuthenticatedRequest = Request & {
  auth?: {
    sessionId: string;
    sessionToken: string;
    user: AuthUser;
  };
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly cookies: AuthCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response | undefined>();
    const requestCookies: unknown = request.cookies;
    const hasSessionCookie =
      typeof requestCookies === "object" &&
      requestCookies !== null &&
      Object.prototype.hasOwnProperty.call(
        requestCookies,
        this.cookies.sessionCookieName,
      );
    const sessionToken =
      typeof requestCookies === "object" && requestCookies !== null
        ? (requestCookies as Record<string, unknown>)[
            this.cookies.sessionCookieName
          ]
        : undefined;

    if (typeof sessionToken !== "string" || sessionToken.length === 0) {
      if (hasSessionCookie && response) this.cookies.clearSession(response);
      throw this.unauthenticated();
    }

    const resolved = await this.sessions.resolve(sessionToken);
    if (!resolved) {
      if (response) this.cookies.clearSession(response);
      throw this.unauthenticated();
    }

    request.auth = {
      sessionId: resolved.sessionId,
      sessionToken,
      user: resolved.user,
    };

    if (response && resolved.refreshedExpiresAt) {
      this.cookies.setSession(
        response,
        sessionToken,
        resolved.refreshedExpiresAt,
      );
    }

    return true;
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({
      code: "UNAUTHENTICATED",
      detail: "로그인이 필요합니다.",
    });
  }
}
