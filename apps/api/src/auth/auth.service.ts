import type { AuthUser } from "@haetteum/contracts";
import { Inject, Injectable, Optional } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { KakaoAuthClient } from "./kakao-auth.client.js";
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kakao: KakaoAuthClient,
    private readonly sessions: SessionService,
    @Optional()
    @Inject(AUTH_CLOCK)
    private readonly clock: (() => number) | undefined = undefined,
  ) {}

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
