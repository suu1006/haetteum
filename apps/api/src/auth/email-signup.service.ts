import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import type { AuthUser } from "@haetteum/contracts";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import {
  EMAIL_SIGNUP_CLOCK,
  EMAIL_SIGNUP_CODE_GENERATOR,
  EMAIL_SIGNUP_CODE_TTL_MS,
  EMAIL_SIGNUP_MAX_CODE_ATTEMPTS,
  EMAIL_SIGNUP_RESEND_COOLDOWN_MS,
} from "./auth.constants.js";
import type { CompletedLogin } from "./auth.service.js";
import { PasswordHasher } from "./password-hasher.service.js";
import { SessionService } from "./session.service.js";
import { VerificationMailService } from "./verification-mail.service.js";

export type EmailSignupStarted = {
  codeExpiresAt: Date;
};

export type EmailSignupVerified = CompletedLogin;

@Injectable()
export class EmailSignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHasher,
    private readonly mail: VerificationMailService,
    private readonly sessions: SessionService,
    @Optional()
    @Inject(EMAIL_SIGNUP_CLOCK)
    private readonly clock: (() => number) | undefined = undefined,
    @Optional()
    @Inject(EMAIL_SIGNUP_CODE_GENERATOR)
    private readonly codeGenerator: (() => string) | undefined = undefined,
  ) {}

  async start(email: string, password: string): Promise<EmailSignupStarted> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException({
        code: "EMAIL_ALREADY_REGISTERED",
        detail: "이미 가입된 이메일이에요. 로그인을 이용해 주세요.",
      });
    }

    const pending = await this.prisma.pendingEmailSignup.findUnique({
      where: { email },
      select: { updatedAt: true },
    });
    const now = this.now();
    if (
      pending &&
      now.getTime() - pending.updatedAt.getTime() <
        EMAIL_SIGNUP_RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        {
          code: "VERIFICATION_CODE_COOLDOWN",
          detail: "잠시 후 다시 시도해 주세요.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateCode();
    try {
      await this.mail.sendVerificationCode(email, code);
    } catch {
      throw new ServiceUnavailableException({
        code: "VERIFICATION_EMAIL_SEND_FAILED",
        detail: "인증 이메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }

    const passwordHash = await this.passwords.hash(password);
    const codeExpiresAt = new Date(now.getTime() + EMAIL_SIGNUP_CODE_TTL_MS);

    await this.prisma.pendingEmailSignup.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        codeHash: this.hashCode(code),
        codeExpiresAt,
        attempts: 0,
      },
      update: {
        passwordHash,
        codeHash: this.hashCode(code),
        codeExpiresAt,
        attempts: 0,
      },
    });

    return { codeExpiresAt };
  }

  async verifyCode(email: string, code: string): Promise<EmailSignupVerified> {
    const pending = await this.prisma.pendingEmailSignup.findUnique({
      where: { email },
    });
    if (!pending) {
      throw new BadRequestException({
        code: "VERIFICATION_CODE_NOT_FOUND",
        detail: "인증번호를 다시 요청해 주세요.",
      });
    }

    const now = this.now();
    if (pending.codeExpiresAt <= now) {
      await this.prisma.pendingEmailSignup.delete({ where: { email } });
      throw new BadRequestException({
        code: "VERIFICATION_CODE_EXPIRED",
        detail: "인증번호가 만료되었어요. 다시 요청해 주세요.",
      });
    }

    if (pending.attempts >= EMAIL_SIGNUP_MAX_CODE_ATTEMPTS) {
      throw new HttpException(
        {
          code: "VERIFICATION_CODE_ATTEMPTS_EXCEEDED",
          detail: "인증 시도 횟수를 초과했어요. 인증번호를 다시 요청해 주세요.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.matchesCode(code, pending.codeHash)) {
      await this.prisma.pendingEmailSignup.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException({
        code: "VERIFICATION_CODE_MISMATCH",
        detail: "인증번호가 일치하지 않아요.",
      });
    }

    const displayName = deriveDisplayName(email);
    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        throw new ConflictException({
          code: "EMAIL_ALREADY_REGISTERED",
          detail: "이미 가입된 이메일이에요. 로그인을 이용해 주세요.",
        });
      }

      const created = await tx.user.create({
        data: {
          provider: "EMAIL",
          providerUserId: email,
          displayName,
          email,
          passwordHash: pending.passwordHash,
        },
        select: { id: true },
      });

      await tx.pendingEmailSignup.delete({ where: { email } });

      return created;
    });

    const authUser: AuthUser = {
      id: user.id,
      displayName,
      profileImageUrl: null,
      provider: "EMAIL",
    };
    const session = await this.sessions.create(user.id);

    return { user: authUser, ...session };
  }

  private generateCode(): string {
    if (this.codeGenerator) return this.codeGenerator();
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  private hashCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  private matchesCode(code: string, codeHash: string): boolean {
    const provided = Buffer.from(this.hashCode(code), "hex");
    const expected = Buffer.from(codeHash, "hex");
    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  }

  private now(): Date {
    return new Date((this.clock ?? Date.now)());
  }
}

function deriveDisplayName(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) return "해뜸 여행자";
  return localPart.slice(0, 100);
}
