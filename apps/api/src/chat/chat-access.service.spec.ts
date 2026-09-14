import { jest } from "@jest/globals";
import { ChatAccessService } from "./chat-access.service.js";
import type { ResolvedSession } from "../auth/session.service.js";
import type { Request, Response } from "express";

const payload = { messages: [{ role: "user" as const, content: "서울" }] };

function setup(enabled = true) {
  const reserve = jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue({ remaining: 4, resetsAt: "2026-09-11T15:00:00.000Z" });
  const resolve = jest
    .fn<(token: string) => Promise<ResolvedSession | null>>()
    .mockResolvedValue(null);
  const cookies = {
    sessionCookieName: "session",
    setSession: jest.fn(),
    clearSession: jest.fn(),
  };
  const service = new ChatAccessService(
    { isConfigured: () => enabled } as never,
    { reserve } as never,
    { resolve } as never,
    cookies as never,
  );
  const response = { setHeader: jest.fn() } as unknown as Response;
  return { service, reserve, resolve, cookies, response };
}

it("rejects missing, empty, and expired sessions before consuming quota", async () => {
  for (const enabled of [true, false]) {
    for (const cookies of [{}, { session: "" }, { session: "expired" }]) {
      const { service, reserve, response } = setup(enabled);
      await expect(
        service.prepare(
          {
            cookies,
            ip: "192.0.2.1",
            body: { userId: "forged" },
          } as unknown as Request,
          response,
          payload,
        ),
      ).rejects.toMatchObject({ status: 401 });
      expect(reserve).not.toHaveBeenCalled();
    }
  }
});

it("uses only the server-resolved user ID", async () => {
  const { service, reserve, resolve, response } = setup();
  resolve.mockResolvedValue({
    userId: "real-user",
    user: { id: "real-user" },
    refreshedExpiresAt: null,
  } as ResolvedSession);
  await service.prepare(
    {
      cookies: { session: "token" },
      ip: "192.0.2.1",
      body: { userId: "forged" },
    } as unknown as Request,
    response,
    payload,
  );
  expect(reserve).toHaveBeenCalledWith({ userId: "real-user" }, payload);
});

it("authenticates but does not charge when the provider is disabled", async () => {
  const { service, reserve, resolve, response } = setup(false);
  resolve.mockResolvedValue({
    userId: "real-user",
    user: { id: "real-user" },
    refreshedExpiresAt: null,
  } as ResolvedSession);
  await expect(
    service.prepare(
      { cookies: { session: "token" } } as unknown as Request,
      response,
      payload,
    ),
  ).rejects.toMatchObject({ status: 503 });
  expect(reserve).not.toHaveBeenCalled();
  expect(resolve).toHaveBeenCalledWith("token");
});

it("does not downgrade a session store failure to anonymous access", async () => {
  const { service, reserve, resolve, response } = setup();
  resolve.mockRejectedValue(new Error("database offline"));
  await expect(
    service.prepare(
      { cookies: { session: "token" }, ip: "192.0.2.1" } as unknown as Request,
      response,
      payload,
    ),
  ).rejects.toMatchObject({ status: 503 });
  expect(reserve).not.toHaveBeenCalled();
});

it("passes the user message through to the quota service on settle", async () => {
  const { reserve, response } = setup();
  const settle = jest
    .fn<(...args: unknown[]) => Promise<void>>()
    .mockResolvedValue(undefined);
  const withSettle = new ChatAccessService(
    { isConfigured: () => true } as never,
    { reserve, settle } as never,
    { resolve: jest.fn() } as never,
    {
      sessionCookieName: "session",
      setSession: jest.fn(),
      clearSession: jest.fn(),
    } as never,
  );
  const reservation = {
    subjectKey: "s",
    requestId: "r",
    attemptId: "a",
    conversationId: "c",
  };

  await withSettle.settle(reservation, "COMPLETED", "답변", "질문");

  expect(settle).toHaveBeenCalledWith(reservation, "COMPLETED", "답변", "질문");
  void response;
});
