import { createHash } from "node:crypto";

import { jest } from "@jest/globals";

import type { PrismaService } from "../prisma/prisma.service.js";
import {
  SESSION_REFRESH_THRESHOLD_MS,
  SESSION_TTL_MS,
  SessionService,
} from "./session.service.js";

const now = new Date("2026-08-26T12:00:00.000Z");
const userId = "10000000-0000-4000-8000-000000000001";
const sessionId = "20000000-0000-4000-8000-000000000001";

function sessionRow(expiresAt: Date) {
  return {
    id: sessionId,
    userId,
    tokenHash: "a".repeat(64),
    expiresAt,
    lastSeenAt: new Date("2026-08-25T12:00:00.000Z"),
    createdAt: new Date("2026-08-12T12:00:00.000Z"),
    updatedAt: new Date("2026-08-25T12:00:00.000Z"),
    user: {
      id: userId,
      provider: "KAKAO",
      providerUserId: "123456789",
      displayName: "해뜸 여행자",
      profileImageUrl: "https://cdn.example.test/profile.jpg",
      lastLoginAt: new Date("2026-08-25T12:00:00.000Z"),
      createdAt: new Date("2026-08-12T12:00:00.000Z"),
      updatedAt: new Date("2026-08-25T12:00:00.000Z"),
    },
  };
}

function createService(row: ReturnType<typeof sessionRow> | null = null) {
  const calls = {
    create: jest
      .fn<() => Promise<{ id: string }>>()
      .mockResolvedValue({ id: sessionId }),
    findUnique: jest
      .fn<() => Promise<ReturnType<typeof sessionRow> | null>>()
      .mockResolvedValue(row),
    update: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    delete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    deleteMany: jest
      .fn<() => Promise<{ count: number }>>()
      .mockResolvedValue({ count: 0 }),
  };
  const prisma = {
    session: calls,
  } as unknown as PrismaService;

  return {
    calls,
    service: new SessionService(prisma, () => now.getTime()),
  };
}

describe("SessionService", () => {
  it("creates a 256-bit opaque token while persisting only its SHA-256 hash", async () => {
    const { calls, service } = createService();

    const created = await service.create(userId);

    expect(created.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(created.expiresAt).toEqual(new Date(now.getTime() + SESSION_TTL_MS));
    expect(calls.create).toHaveBeenCalledWith({
      data: {
        userId,
        tokenHash: createHash("sha256")
          .update(created.sessionToken)
          .digest("hex"),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        lastSeenAt: now,
      },
    });
  });

  it("resolves a live session into public user data and internal session identity", async () => {
    const row = sessionRow(new Date(now.getTime() + SESSION_TTL_MS));
    const { calls, service } = createService(row);
    const rawToken = "A".repeat(43);

    await expect(service.resolve(rawToken)).resolves.toEqual({
      sessionId,
      userId,
      user: {
        id: userId,
        displayName: "해뜸 여행자",
        profileImageUrl: "https://cdn.example.test/profile.jpg",
        provider: "KAKAO",
      },
      refreshedExpiresAt: null,
    });
    expect(calls.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      },
      include: { user: true },
    });
    expect(calls.update).not.toHaveBeenCalled();
  });

  it("idempotently deletes an expired row constrained to the observed expiry", async () => {
    const row = sessionRow(new Date(now.getTime() - 1));
    const { calls, service } = createService(row);

    await expect(service.resolve("A".repeat(43))).resolves.toBeNull();
    expect(calls.deleteMany).toHaveBeenCalledWith({
      where: {
        id: sessionId,
        expiresAt: { lte: now },
      },
    });
  });

  it("does not refresh a session with exactly seven days remaining", async () => {
    const row = sessionRow(
      new Date(now.getTime() + SESSION_REFRESH_THRESHOLD_MS),
    );
    const { calls, service } = createService(row);

    await expect(service.resolve("A".repeat(43))).resolves.toMatchObject({
      refreshedExpiresAt: null,
    });
    expect(calls.update).not.toHaveBeenCalled();
  });

  it("refreshes a session with less than seven days remaining", async () => {
    const row = sessionRow(
      new Date(now.getTime() + SESSION_REFRESH_THRESHOLD_MS - 1),
    );
    const { calls, service } = createService(row);

    await expect(service.resolve("A".repeat(43))).resolves.toMatchObject({
      refreshedExpiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    });
    expect(calls.update).toHaveBeenCalledWith({
      where: { id: sessionId },
      data: {
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        lastSeenAt: now,
      },
    });
  });

  it("revokes the token hash without failing when no session exists", async () => {
    const { calls, service } = createService();
    const rawToken = "A".repeat(43);

    await expect(service.revoke(rawToken)).resolves.toBeUndefined();

    expect(calls.deleteMany).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      },
    });
  });
});
