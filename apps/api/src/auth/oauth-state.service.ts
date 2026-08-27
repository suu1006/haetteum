import { randomBytes, timingSafeEqual } from "node:crypto";

import { Inject, Injectable, Optional } from "@nestjs/common";
import { z } from "zod";

import { OAUTH_STATE_CLOCK, OAUTH_STATE_TTL_MS } from "./auth.constants.js";
import type { OAuthStateAttempt, OAuthStateResult } from "./auth.types.js";

const stateSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const encodedAsciiControlPattern = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;

function containsAsciiControl(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}
const stateCookieSchema = z.object({
  state: stateSchema,
  returnTo: z.string(),
  createdAt: z.number().int().nonnegative(),
});

@Injectable()
export class OAuthStateService {
  constructor(
    @Optional()
    @Inject(OAUTH_STATE_CLOCK)
    private readonly clock: (() => number) | undefined = undefined,
  ) {}

  sanitizeReturnTo(returnTo: string | undefined): string {
    if (
      typeof returnTo !== "string" ||
      !returnTo.startsWith("/") ||
      returnTo.startsWith("//") ||
      returnTo.includes("\\") ||
      containsAsciiControl(returnTo) ||
      encodedAsciiControlPattern.test(returnTo)
    ) {
      return "/";
    }

    return returnTo;
  }

  create(returnTo: string | undefined): OAuthStateAttempt {
    const state = randomBytes(32).toString("base64url");
    const payload = {
      state,
      returnTo: this.sanitizeReturnTo(returnTo),
      createdAt: this.now(),
    };

    return {
      state,
      cookieValue: Buffer.from(JSON.stringify(payload)).toString("base64url"),
    };
  }

  consume(
    queryState: string | undefined,
    cookieValue: string | undefined,
  ): OAuthStateResult {
    const payload = this.parseCookie(cookieValue);
    if (
      !payload ||
      typeof queryState !== "string" ||
      !stateSchema.safeParse(queryState).success
    ) {
      throw new Error("OAUTH_STATE_INVALID");
    }

    if (this.now() - payload.createdAt > OAUTH_STATE_TTL_MS) {
      throw new Error("OAUTH_STATE_EXPIRED");
    }

    const queryStateBuffer = Buffer.from(queryState, "utf8");
    const cookieStateBuffer = Buffer.from(payload.state, "utf8");
    if (
      queryStateBuffer.length !== cookieStateBuffer.length ||
      !timingSafeEqual(queryStateBuffer, cookieStateBuffer)
    ) {
      throw new Error("OAUTH_STATE_INVALID");
    }

    return { returnTo: this.sanitizeReturnTo(payload.returnTo) };
  }

  private now(): number {
    return (this.clock ?? Date.now)();
  }

  private parseCookie(cookieValue: string | undefined) {
    if (!cookieValue) return null;

    try {
      if (!/^[A-Za-z0-9_-]+$/.test(cookieValue)) return null;
      const decodedCookie = Buffer.from(cookieValue, "base64url");
      if (decodedCookie.toString("base64url") !== cookieValue) return null;

      return (
        stateCookieSchema.safeParse(JSON.parse(decodedCookie.toString("utf8")))
          .data ?? null
      );
    } catch {
      return null;
    }
  }
}
