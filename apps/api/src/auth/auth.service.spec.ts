import { jest } from "@jest/globals";

import type { PrismaService } from "../prisma/prisma.service.js";
import type { KakaoAuthClient } from "./kakao-auth.client.js";
import { AuthService } from "./auth.service.js";
import type { SessionService } from "./session.service.js";

const now = new Date("2026-08-26T12:00:00.000Z");
const expiresAt = new Date("2026-09-09T12:00:00.000Z");
const userId = "10000000-0000-4000-8000-000000000001";
const identity = {
  providerUserId: "123456789",
  displayName: "해뜸 여행자",
  profileImageUrl: "https://cdn.example.test/profile.jpg",
};

function userRow(overrides: Partial<typeof baseUserRow> = {}) {
  return { ...baseUserRow, ...overrides };
}

const baseUserRow = {
  id: userId,
  provider: "KAKAO",
  providerUserId: identity.providerUserId,
  displayName: identity.displayName,
  profileImageUrl: identity.profileImageUrl,
  lastLoginAt: now,
  createdAt: new Date("2026-08-20T12:00:00.000Z"),
  updatedAt: now,
};

function createService(options?: {
  exchangeError?: Error;
  userError?: Error;
  upsertError?: Error;
  sessionError?: Error;
  persistedUser?: ReturnType<typeof userRow>;
}) {
  const exchangeCode = options?.exchangeError
    ? jest.fn().mockRejectedValue(options.exchangeError)
    : jest.fn().mockResolvedValue("provider-access-token");
  const getUser = options?.userError
    ? jest.fn().mockRejectedValue(options.userError)
    : jest.fn().mockResolvedValue(identity);
  const upsert = options?.upsertError
    ? jest.fn().mockRejectedValue(options.upsertError)
    : jest.fn().mockResolvedValue(options?.persistedUser ?? userRow());
  const create = options?.sessionError
    ? jest.fn().mockRejectedValue(options.sessionError)
    : jest.fn().mockResolvedValue({
        sessionToken: "A".repeat(43),
        expiresAt,
      });
  const kakao = { exchangeCode, getUser } as unknown as KakaoAuthClient;
  const prisma = { user: { upsert } } as unknown as PrismaService;
  const sessions = { create } as unknown as SessionService;

  return {
    service: new AuthService(prisma, kakao, sessions, () => now.getTime()),
    exchangeCode,
    getUser,
    upsert,
    create,
  };
}

describe("AuthService", () => {
  it("creates the first KAKAO user from the provider identity and returns only public session data", async () => {
    const { service, exchangeCode, getUser, upsert, create } = createService();

    await expect(
      service.completeKakaoLogin("authorization-code"),
    ).resolves.toEqual({
      user: {
        id: userId,
        displayName: "해뜸 여행자",
        profileImageUrl: "https://cdn.example.test/profile.jpg",
      },
      sessionToken: "A".repeat(43),
      expiresAt,
    });
    expect(exchangeCode).toHaveBeenCalledWith("authorization-code");
    expect(getUser).toHaveBeenCalledWith("provider-access-token");
    expect(upsert).toHaveBeenCalledWith({
      where: {
        provider_providerUserId: {
          provider: "KAKAO",
          providerUserId: "123456789",
        },
      },
      create: {
        provider: "KAKAO",
        providerUserId: "123456789",
        displayName: "해뜸 여행자",
        profileImageUrl: "https://cdn.example.test/profile.jpg",
        lastLoginAt: now,
      },
      update: {
        displayName: "해뜸 여행자",
        profileImageUrl: "https://cdn.example.test/profile.jpg",
        lastLoginAt: now,
      },
    });
    expect(create).toHaveBeenCalledWith(userId);
  });

  it("refreshes mutable profile fields and lastLoginAt on a repeat login", async () => {
    const persistedUser = userRow({
      displayName: "새 카카오 닉네임",
      profileImageUrl: null,
    });
    const { service, upsert } = createService({ persistedUser });

    const result = await service.completeKakaoLogin("repeat-code");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          displayName: "해뜸 여행자",
          profileImageUrl: "https://cdn.example.test/profile.jpg",
          lastLoginAt: now,
        },
      }),
    );
    expect(result.user).toEqual({
      id: userId,
      displayName: "새 카카오 닉네임",
      profileImageUrl: null,
    });
  });

  it("does not touch PostgreSQL or create a session when Kakao fails", async () => {
    const { service, upsert, create } = createService({
      exchangeError: new Error(
        "code=secret-authorization-code token=secret-access-token",
      ),
    });

    const failure = service.completeKakaoLogin("secret-authorization-code");

    await expect(failure).rejects.toThrow("AUTH_LOGIN_FAILED");
    await failure.catch((error: unknown) => {
      expect(String(error)).not.toContain("secret-authorization-code");
      expect(String(error)).not.toContain("secret-access-token");
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("does not create a session when the user upsert fails", async () => {
    const { service, create } = createService({
      upsertError: new Error("DATABASE_URL=secret provider-body"),
    });

    const failure = service.completeKakaoLogin("authorization-code");

    await expect(failure).rejects.toThrow("AUTH_LOGIN_FAILED");
    await failure.catch((error: unknown) => {
      expect(String(error)).not.toContain("DATABASE_URL");
      expect(String(error)).not.toContain("provider-body");
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("surfaces a safe failure and returns no token when session creation fails", async () => {
    const { service } = createService({
      sessionError: new Error("session-token=raw-secret"),
    });

    const failure = service.completeKakaoLogin("authorization-code");

    await expect(failure).rejects.toThrow("AUTH_LOGIN_FAILED");
    await failure.catch((error: unknown) => {
      expect(String(error)).not.toContain("raw-secret");
      expect(Object.keys(error as object)).not.toContain("sessionToken");
    });
  });
});
