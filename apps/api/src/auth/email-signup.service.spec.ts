import { jest } from "@jest/globals";

import type { PrismaService } from "../prisma/prisma.service.js";
import { EmailSignupService } from "./email-signup.service.js";
import type { PasswordHasher } from "./password-hasher.service.js";
import type { CreatedSession, SessionService } from "./session.service.js";
import type { VerificationMailService } from "./verification-mail.service.js";

const now = new Date("2026-09-09T12:00:00.000Z");
const sessionExpiresAt = new Date("2026-09-23T12:00:00.000Z");
const userId = "10000000-0000-4000-8000-000000000002";
const email = "traveler@haetteum.kr";

function createService(options?: {
  now?: Date;
  code?: string;
  findUniqueUser?: { id: string } | null;
  findUniquePending?: Record<string, unknown> | null;
  sendError?: Error;
  txFindUniqueUser?: { id: string } | null;
}) {
  const findUniqueUser = jest
    .fn<() => Promise<{ id: string } | null>>()
    .mockResolvedValue(options?.findUniqueUser ?? null);
  const findUniquePending = jest
    .fn<() => Promise<Record<string, unknown> | null>>()
    .mockResolvedValue(options?.findUniquePending ?? null);
  const upsertPending = jest
    .fn<(args: unknown) => Promise<Record<string, unknown>>>()
    .mockResolvedValue({});
  const updatePending = jest
    .fn<() => Promise<Record<string, unknown>>>()
    .mockResolvedValue({});
  const deletePending = jest
    .fn<() => Promise<Record<string, unknown>>>()
    .mockResolvedValue({});
  const sendVerificationCode = options?.sendError
    ? jest.fn<() => Promise<void>>().mockRejectedValue(options.sendError)
    : jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const hash = jest
    .fn<() => Promise<string>>()
    .mockResolvedValue("hashed-password");

  const txUserCreate = jest
    .fn<() => Promise<{ id: string }>>()
    .mockResolvedValue({ id: userId });
  const txUserFindUnique = jest
    .fn<() => Promise<{ id: string } | null>>()
    .mockResolvedValue(options?.txFindUniqueUser ?? null);
  const txPendingDelete = jest
    .fn<() => Promise<Record<string, unknown>>>()
    .mockResolvedValue({});

  type Tx = {
    user: { findUnique: typeof txUserFindUnique; create: typeof txUserCreate };
    pendingEmailSignup: { delete: typeof txPendingDelete };
  };
  const tx: Tx = {
    user: { findUnique: txUserFindUnique, create: txUserCreate },
    pendingEmailSignup: { delete: txPendingDelete },
  };
  const transaction = jest.fn((callback: (tx: Tx) => unknown) => callback(tx));

  const prisma = {
    user: { findUnique: findUniqueUser },
    pendingEmailSignup: {
      findUnique: findUniquePending,
      upsert: upsertPending,
      update: updatePending,
      delete: deletePending,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const passwords = { hash } as unknown as PasswordHasher;
  const mail = { sendVerificationCode } as unknown as VerificationMailService;
  const createSession = jest
    .fn<() => Promise<CreatedSession>>()
    .mockResolvedValue({
      sessionToken: "A".repeat(43),
      expiresAt: sessionExpiresAt,
    });
  const sessions = { create: createSession } as unknown as SessionService;

  const service = new EmailSignupService(
    prisma,
    passwords,
    mail,
    sessions,
    () => (options?.now ?? now).getTime(),
    () => options?.code ?? "123456",
  );

  return {
    service,
    findUniqueUser,
    findUniquePending,
    upsertPending,
    updatePending,
    deletePending,
    sendVerificationCode,
    hash,
    txUserCreate,
    txUserFindUnique,
    txPendingDelete,
    transaction,
    createSession,
  };
}

describe("EmailSignupService", () => {
  describe("start", () => {
    it("rejects an email that already belongs to a verified user", async () => {
      const { service, sendVerificationCode } = createService({
        findUniqueUser: { id: userId },
      });

      await expect(service.start(email, "Password1!")).rejects.toMatchObject({
        status: 409,
      });
      expect(sendVerificationCode).not.toHaveBeenCalled();
    });

    it("rejects a resend within the cooldown window", async () => {
      const { service, sendVerificationCode } = createService({
        findUniquePending: { updatedAt: new Date(now.getTime() - 5_000) },
      });

      await expect(service.start(email, "Password1!")).rejects.toMatchObject({
        status: 429,
      });
      expect(sendVerificationCode).not.toHaveBeenCalled();
    });

    it("sends a code and stores its hash, not the plaintext code", async () => {
      const { service, sendVerificationCode, upsertPending, hash } =
        createService({
          findUniquePending: { updatedAt: new Date(now.getTime() - 60_000) },
        });

      const result = await service.start(email, "Password1!");

      expect(sendVerificationCode).toHaveBeenCalledWith(email, "123456");
      expect(hash).toHaveBeenCalledWith("Password1!");
      expect(upsertPending).toHaveBeenCalledWith({
        where: { email },
        create: {
          email,
          passwordHash: "hashed-password",
          codeHash: expect.any(String) as string,
          codeExpiresAt: expect.any(Date) as Date,
          attempts: 0,
        },
        update: {
          passwordHash: "hashed-password",
          codeHash: expect.any(String) as string,
          codeExpiresAt: expect.any(Date) as Date,
          attempts: 0,
        },
      });
      expect(
        (upsertPending.mock.calls[0]?.[0] as { create: { codeHash: string } })
          .create.codeHash,
      ).not.toBe("123456");
      expect(result.codeExpiresAt.getTime()).toBe(now.getTime() + 3 * 60_000);
    });

    it("does not persist a pending signup when sending the email fails", async () => {
      const { service, upsertPending } = createService({
        sendError: new Error("smtp down"),
      });

      await expect(service.start(email, "Password1!")).rejects.toMatchObject({
        status: 503,
      });
      expect(upsertPending).not.toHaveBeenCalled();
    });
  });

  describe("verifyCode", () => {
    it("rejects when there is no pending signup for the email", async () => {
      const { service } = createService({ findUniquePending: null });

      await expect(service.verifyCode(email, "123456")).rejects.toMatchObject({
        status: 400,
      });
    });

    it("rejects and clears an expired code", async () => {
      const { service, deletePending } = createService({
        findUniquePending: {
          codeExpiresAt: new Date(now.getTime() - 1_000),
          attempts: 0,
          codeHash: "irrelevant",
          passwordHash: "hashed-password",
        },
      });

      await expect(service.verifyCode(email, "123456")).rejects.toMatchObject({
        status: 400,
      });
      expect(deletePending).toHaveBeenCalledWith({ where: { email } });
    });

    it("rejects a mismatched code and increments attempts", async () => {
      const codeHash =
        "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"; // sha256("123456")
      const { service, updatePending } = createService({
        findUniquePending: {
          codeExpiresAt: new Date(now.getTime() + 60_000),
          attempts: 0,
          codeHash,
          passwordHash: "hashed-password",
        },
      });

      await expect(service.verifyCode(email, "000000")).rejects.toMatchObject({
        status: 400,
      });
      expect(updatePending).toHaveBeenCalledWith({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
    });

    it("rejects once the attempt limit is reached without checking the code", async () => {
      const { service, updatePending } = createService({
        findUniquePending: {
          codeExpiresAt: new Date(now.getTime() + 60_000),
          attempts: 5,
          codeHash: "irrelevant",
          passwordHash: "hashed-password",
        },
      });

      await expect(service.verifyCode(email, "123456")).rejects.toMatchObject({
        status: 429,
      });
      expect(updatePending).not.toHaveBeenCalled();
    });

    it("creates the user and consumes the pending signup on a matching code", async () => {
      const codeHash =
        "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"; // sha256("123456")
      const { service, txUserCreate, txPendingDelete, createSession } =
        createService({
          findUniquePending: {
            codeExpiresAt: new Date(now.getTime() + 60_000),
            attempts: 0,
            codeHash,
            passwordHash: "hashed-password",
          },
        });

      const result = await service.verifyCode(email, "123456");

      expect(result).toEqual({
        user: {
          id: userId,
          displayName: "traveler",
          profileImageUrl: null,
          provider: "EMAIL",
        },
        sessionToken: "A".repeat(43),
        expiresAt: sessionExpiresAt,
      });
      expect(txUserCreate).toHaveBeenCalledWith({
        data: {
          provider: "EMAIL",
          providerUserId: email,
          displayName: "traveler",
          email,
          passwordHash: "hashed-password",
        },
        select: { id: true },
      });
      expect(txPendingDelete).toHaveBeenCalledWith({ where: { email } });
      expect(createSession).toHaveBeenCalledWith(userId);
    });

    it("rejects a race where the email became registered during verification", async () => {
      const codeHash =
        "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"; // sha256("123456")
      const { service, txUserCreate } = createService({
        findUniquePending: {
          codeExpiresAt: new Date(now.getTime() + 60_000),
          attempts: 0,
          codeHash,
          passwordHash: "hashed-password",
        },
        txFindUniqueUser: { id: userId },
      });

      await expect(service.verifyCode(email, "123456")).rejects.toMatchObject({
        status: 409,
      });
      expect(txUserCreate).not.toHaveBeenCalled();
    });
  });
});
