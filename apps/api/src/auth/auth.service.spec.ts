import { jest } from "@jest/globals";

import type { PrismaService } from "../prisma/prisma.service.js";
import type { KakaoIdentity } from "./auth.types.js";
import type { KakaoAuthClient } from "./kakao-auth.client.js";
import { AuthService } from "./auth.service.js";
import type { PasswordHasher } from "./password-hasher.service.js";
import type { CreatedSession, SessionService } from "./session.service.js";

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
  findUniqueUser?: ReturnType<typeof userRow> | null;
  verifyPassword?: boolean;
  updateUser?: ReturnType<typeof userRow>;
}) {
  const exchangeCode = options?.exchangeError
    ? jest.fn<() => Promise<string>>().mockRejectedValue(options.exchangeError)
    : jest
        .fn<() => Promise<string>>()
        .mockResolvedValue("provider-access-token");
  const getUser = options?.userError
    ? jest
        .fn<() => Promise<KakaoIdentity>>()
        .mockRejectedValue(options.userError)
    : jest.fn<() => Promise<KakaoIdentity>>().mockResolvedValue(identity);
  const upsert = options?.upsertError
    ? jest
        .fn<() => Promise<ReturnType<typeof userRow>>>()
        .mockRejectedValue(options.upsertError)
    : jest
        .fn<() => Promise<ReturnType<typeof userRow>>>()
        .mockResolvedValue(options?.persistedUser ?? userRow());
  const create = options?.sessionError
    ? jest
        .fn<() => Promise<CreatedSession>>()
        .mockRejectedValue(options.sessionError)
    : jest.fn<() => Promise<CreatedSession>>().mockResolvedValue({
        sessionToken: "A".repeat(43),
        expiresAt,
      });
  const findUnique = jest
    .fn<() => Promise<ReturnType<typeof userRow> | null>>()
    .mockResolvedValue(
      options?.findUniqueUser === undefined ? null : options.findUniqueUser,
    );
  const update = jest
    .fn<() => Promise<ReturnType<typeof userRow>>>()
    .mockResolvedValue(options?.updateUser ?? userRow());
  const verify = jest
    .fn<() => Promise<boolean>>()
    .mockResolvedValue(options?.verifyPassword ?? true);

  const kakao = { exchangeCode, getUser } as unknown as KakaoAuthClient;
  const prisma = {
    user: { upsert, findUnique, update },
  } as unknown as PrismaService;
  const sessions = { create } as unknown as SessionService;
  const passwords = { verify } as unknown as PasswordHasher;

  return {
    service: new AuthService(prisma, kakao, sessions, passwords, () =>
      now.getTime(),
    ),
    exchangeCode,
    getUser,
    upsert,
    create,
    findUnique,
    update,
    verify,
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
        provider: "KAKAO",
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
      provider: "KAKAO",
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

  describe("completeEmailLogin", () => {
    const emailUser = userRow({
      provider: "EMAIL",
      providerUserId: "traveler@haetteum.kr",
      email: "traveler@haetteum.kr",
      passwordHash: "$2b$12$stored-hash",
      displayName: "traveler",
    });

    it("logs in with a matching email and password, refreshing lastLoginAt", async () => {
      const { service, findUnique, update, verify, create } = createService({
        findUniqueUser: emailUser,
      });

      const result = await service.completeEmailLogin(
        "traveler@haetteum.kr",
        "correct-password",
      );

      expect(findUnique).toHaveBeenCalledWith({
        where: { email: "traveler@haetteum.kr" },
      });
      expect(verify).toHaveBeenCalledWith(
        "correct-password",
        "$2b$12$stored-hash",
      );
      expect(update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastLoginAt: now },
      });
      expect(create).toHaveBeenCalledWith(userId);
      expect(result.user).toEqual({
        id: userId,
        displayName: "traveler",
        profileImageUrl: identity.profileImageUrl,
        provider: "EMAIL",
      });
    });

    it("rejects when no user exists for the email", async () => {
      const { service } = createService({ findUniqueUser: null });

      await expect(
        service.completeEmailLogin("nobody@haetteum.kr", "any-password"),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("rejects a kakao-only account that has no password set", async () => {
      const { service } = createService({
        findUniqueUser: userRow({ email: null, passwordHash: null }),
      });

      await expect(
        service.completeEmailLogin("traveler@haetteum.kr", "any-password"),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("rejects a wrong password without touching the session", async () => {
      const { service, create } = createService({
        findUniqueUser: emailUser,
        verifyPassword: false,
      });

      await expect(
        service.completeEmailLogin("traveler@haetteum.kr", "wrong-password"),
      ).rejects.toMatchObject({ status: 401 });
      expect(create).not.toHaveBeenCalled();
    });
  });
});
