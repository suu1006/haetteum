import { jest } from "@jest/globals";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Response } from "express";

import { AuthCookieService } from "./auth-cookie.service.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import type { ResolvedSession, SessionService } from "./session.service.js";

const rawToken = "A".repeat(43);
const resolved: ResolvedSession = {
  sessionId: "20000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000001",
  user: {
    id: "10000000-0000-4000-8000-000000000001",
    displayName: "해뜸 여행자",
    profileImageUrl: "https://cdn.example.test/profile.jpg",
  },
  refreshedExpiresAt: null,
};

function createGuard(
  resolvedSession: ResolvedSession | null,
  cookies: Record<string, unknown> = { haetteum_session: rawToken },
) {
  const resolve = jest.fn().mockResolvedValue(resolvedSession);
  const session = {
    resolve,
  } as unknown as SessionService;
  const clearSession = jest.fn();
  const setSession = jest.fn();
  const authCookies = {
    sessionCookieName: "haetteum_session",
    clearSession,
    setSession,
  } as unknown as AuthCookieService;
  const request = { cookies };
  const response = {} as Response;
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  return {
    guard: new SessionAuthGuard(session, authCookies),
    resolve,
    clearSession,
    setSession,
    request,
    response,
    context,
  };
}

async function expectUnauthenticated(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
  await promise.catch((error: unknown) => {
    expect((error as UnauthorizedException).getResponse()).toEqual({
      code: "UNAUTHENTICATED",
      detail: "로그인이 필요합니다.",
    });
  });
}

describe("SessionAuthGuard", () => {
  it("rejects a request with no session cookie", async () => {
    const { guard, resolve, clearSession, context } = createGuard(null, {});

    await expectUnauthenticated(guard.canActivate(context));

    expect(resolve).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it.each(["", 42])(
    "clears a present but malformed session cookie before rejecting it (%p)",
    async (cookieValue) => {
      const { guard, resolve, clearSession, response, context } = createGuard(
        null,
        { haetteum_session: cookieValue },
      );

      await expectUnauthenticated(guard.canActivate(context));

      expect(resolve).not.toHaveBeenCalled();
      expect(clearSession).toHaveBeenCalledWith(response);
    },
  );

  it("clears an unknown session cookie before rejecting the request", async () => {
    const { guard, resolve, clearSession, response, context } =
      createGuard(null);

    await expectUnauthenticated(guard.canActivate(context));

    expect(resolve).toHaveBeenCalledWith(rawToken);
    expect(clearSession).toHaveBeenCalledWith(response);
  });

  it("clears an expired session cookie before rejecting the request", async () => {
    const { guard, clearSession, response, context } = createGuard(null);

    await expectUnauthenticated(guard.canActivate(context));

    expect(clearSession).toHaveBeenCalledWith(response);
  });

  it("attaches exactly the server-resolved session and public user to a live request", async () => {
    const { guard, request, context } = createGuard(resolved);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request).toMatchObject({
      auth: {
        sessionId: "20000000-0000-4000-8000-000000000001",
        sessionToken: rawToken,
        user: {
          id: "10000000-0000-4000-8000-000000000001",
          displayName: "해뜸 여행자",
          profileImageUrl: "https://cdn.example.test/profile.jpg",
        },
      },
    });
  });

  it("rewrites the cookie only when session resolution refreshes its expiry", async () => {
    const refreshedExpiresAt = new Date("2026-09-09T12:00:00.000Z");
    const { guard, setSession, response, context } = createGuard({
      ...resolved,
      refreshedExpiresAt,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(setSession).toHaveBeenCalledWith(
      response,
      rawToken,
      refreshedExpiresAt,
    );
  });
});
