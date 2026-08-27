import { createHash, randomBytes } from "node:crypto";

import type { AuthUser } from "@haetteum/contracts";
import { Inject, Injectable, Optional } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1_000;
export const SESSION_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1_000;
export const SESSION_CLOCK = Symbol("SESSION_CLOCK");

export type CreatedSession = {
  sessionToken: string;
  expiresAt: Date;
};

export type ResolvedSession = {
  sessionId: string;
  userId: string;
  user: AuthUser;
  refreshedExpiresAt: Date | null;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(SESSION_CLOCK)
    private readonly clock: (() => number) | undefined = undefined,
  ) {}

  async create(userId: string): Promise<CreatedSession> {
    const sessionToken = randomBytes(32).toString("base64url");
    const now = this.now();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hash(sessionToken),
        expiresAt,
        lastSeenAt: now,
      },
    });

    return { sessionToken, expiresAt };
  }

  async resolve(rawToken: string): Promise<ResolvedSession | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      include: { user: true },
    });
    if (!session) return null;

    const now = this.now();
    if (session.expiresAt <= now) {
      await this.prisma.session.deleteMany({
        where: {
          id: session.id,
          expiresAt: { lte: now },
        },
      });
      return null;
    }

    let refreshedExpiresAt: Date | null = null;
    if (
      session.expiresAt.getTime() - now.getTime() <
      SESSION_REFRESH_THRESHOLD_MS
    ) {
      refreshedExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);
      await this.prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: refreshedExpiresAt, lastSeenAt: now },
      });
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      user: {
        id: session.user.id,
        displayName: session.user.displayName,
        profileImageUrl: session.user.profileImageUrl,
      },
      refreshedExpiresAt,
    };
  }

  async revoke(rawToken: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hash(rawToken) },
    });
  }

  private hash(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private now(): Date {
    return new Date((this.clock ?? Date.now)());
  }
}
