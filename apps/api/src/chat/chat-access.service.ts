import {
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { ChatRequest } from "@haetteum/contracts";
import type { Request, Response } from "express";
import { AuthCookieService } from "../auth/auth-cookie.service.js";
import { SessionService } from "../auth/session.service.js";
import { CHAT_LLM_PORT, type ChatLlmPort } from "./chat.constants.js";
import { chatHttpError } from "./chat-errors.js";
import {
  ChatQuotaService,
  type ChatReservation,
} from "./chat-quota.service.js";

/** Admission runs after body validation and before flushing stream headers. */
@Injectable()
export class ChatAccessService {
  constructor(
    @Inject(CHAT_LLM_PORT) private readonly llm: ChatLlmPort,
    private readonly quota: ChatQuotaService,
    private readonly sessions: SessionService,
    private readonly cookies: AuthCookieService,
  ) {}

  settle(
    reservation: ChatReservation,
    status: "COMPLETED" | "REFUNDED" | "CANCELLED",
    reply?: string,
  ): Promise<void> {
    return this.quota.settle(reservation, status, reply);
  }

  async prepare(
    request: Request,
    response: Response,
    chatRequest: ChatRequest,
  ): Promise<ChatReservation> {
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
      return await this.quota.reserve({ userId: session.userId }, chatRequest);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw chatHttpError(503);
    }
  }
}
