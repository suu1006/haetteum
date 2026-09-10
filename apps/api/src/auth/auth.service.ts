import type { AuthUser } from "@haetteum/contracts";
import {
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { KakaoAuthClient } from "./kakao-auth.client.js";
import { PasswordHasher } from "./password-hasher.service.js";
import { SessionService } from "./session.service.js";

export const AUTH_CLOCK = Symbol("AUTH_CLOCK");

export type CompletedLogin = {
  user: AuthUser;
  sessionToken: string;
  expiresAt: Date;
};

export class AuthLoginError extends Error {
  constructor() {
    super("AUTH_LOGIN_FAILED");
  }
}

const INVALID_CREDENTIALS_ERROR = {
  code: "INVALID_CREDENTIALS",
  detail: "이메일 또는 비밀번호가 올바르지 않아요.",
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kakao: KakaoAuthClient,
    private readonly sessions: SessionService,
    private readonly passwords: PasswordHasher,
    @Optional()
    @Inject(AUTH_CLOCK)
    private readonly clock: (() => number) | undefined = undefined,
  ) {}

  async completeEmailLogin(
    email: string,
    password: string,
  ): Promise<CompletedLogin> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_ERROR);
    }

    const passwordMatches = await this.passwords.verify(
      password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_ERROR);
    }

    const lastLoginAt = new Date((this.clock ?? Date.now)());
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt },
    });
    const session = await this.sessions.create(user.id);

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
      },
      ...session,
    };
  }

  async completeKakaoLogin(code: string): Promise<CompletedLogin> {
    try {
      const accessToken = await this.kakao.exchangeCode(code);
      const identity = await this.kakao.getUser(accessToken);
      const lastLoginAt = new Date((this.clock ?? Date.now)());
      const profile = {
        displayName: identity.displayName,
        profileImageUrl: identity.profileImageUrl,
        lastLoginAt,
      };
      const user = await this.prisma.user.upsert({
        where: {
          provider_providerUserId: {
            provider: "KAKAO",
            providerUserId: identity.providerUserId,
          },
        },
        create: {
          provider: "KAKAO",
          providerUserId: identity.providerUserId,
          ...profile,
        },
        update: profile,
      });
      const session = await this.sessions.create(user.id);

      return {
        user: {
          id: user.id,
          displayName: user.displayName,
          profileImageUrl: user.profileImageUrl,
        },
        ...session,
      };
    } catch {
      throw new AuthLoginError();
    }
  }
}
