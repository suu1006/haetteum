import {
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthCookieService } from "../auth/auth-cookie.service.js";
import { SessionService } from "../auth/session.service.js";
import { CHAT_LLM_PORT, type ChatLlmPort } from "./chat.constants.js";
import { chatHttpError } from "./chat-errors.js";
import { ChatQuotaService } from "./chat-quota.service.js";

/** Admission runs after body validation and before flushing stream headers. */
@Injectable()
export class ChatAccessService {
  constructor(
    @Inject(CHAT_LLM_PORT) private readonly llm: ChatLlmPort,
    private readonly quota: ChatQuotaService,
    private readonly sessions: SessionService,
    private readonly cookies: AuthCookieService,
  ) {}

  async prepare(request: Request, response: Response): Promise<void> {
    try {
      const requestCookies: unknown = request.cookies;
      const token =
        typeof requestCookies === "object" &&
        requestCookies !== null &&
        Object.hasOwn(requestCookies, this.cookies.sessionCookieName)
          ? (requestCookies as Record<string, unknown>)[
              this.cookies.sessionCookieName
            ]
          : undefined;
      const session =
        typeof token === "string" && token.length > 0
          ? await this.sessions.resolve(token)
          : null;
      if (token !== undefined && !session) this.cookies.clearSession(response);
      if (!session) {
        throw new UnauthorizedException({
          code: "UNAUTHENTICATED",
          detail: "챗봇은 로그인 후 이용할 수 있어요.",
        });
      }
      if (session.refreshedExpiresAt && typeof token === "string") {
        this.cookies.setSession(response, token, session.refreshedExpiresAt);
      }
      if (!this.llm.isConfigured()) throw chatHttpError(503);
      await this.quota.consume({ userId: session.userId });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw chatHttpError(503);
    }
  }
}
