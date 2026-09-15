import { unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnvironment } from "../config/environment.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  PROFILE_PHOTO_UPLOADS_DIR,
  PROFILE_PHOTO_UPLOADS_URL_PREFIX,
} from "../profile/profile-photo.constants.js";
import {
  REVIEW_UPLOADS_DIR,
  REVIEW_UPLOADS_URL_PREFIX,
} from "../reviews/review-images.constants.js";

@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ApiEnvironment, true>,
  ) {}

  async remove(userId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        // Prevent new FK-backed personal records while collecting/deleting this account.
        const users = await tx.$queryRaw<
          { email: string | null; profile_image_url: string | null }[]
        >`
        SELECT email, profile_image_url FROM users WHERE id = ${userId}::uuid FOR UPDATE
      `;
        const user = users[0];
        if (!user) throw new UnauthorizedException();
        const attachments = await tx.reviewImage.findMany({
          where: { review: { userId } },
          select: { url: true },
        });

        // Legacy files are not covered by PostgreSQL cascades. Do not report success
        // when an owned file cannot be removed. A retry tolerates already absent files.
        const urls = new Set(attachments.map((image) => image.url));
        if (user.profile_image_url) urls.add(user.profile_image_url);
        for (const url of urls) await this.removeLegacyImage(url);

        // Remove attachments before owned image bytes (their FK is RESTRICT).
        // Deleting reviews first also blocks new reports from retaining their snapshots.
        await tx.review.deleteMany({ where: { userId } });
        await tx.reviewReport.deleteMany({
          where: { OR: [{ reporterId: userId }, { authorIdSnapshot: userId }] },
        });
        const subjectKey = `user:${userId}`;
        await tx.$executeRaw`DELETE FROM chat_requests WHERE subject_key = ${subjectKey}`;
        await tx.chatDailyUsage.deleteMany({ where: { subjectKey } });
        if (user.email)
          await tx.pendingEmailSignup.deleteMany({
            where: { email: user.email },
          });
        // Includes uploaded image bytes, all sessions, preferences, favorites,
        // saved courses/stops, conversations/messages and both directions of blocks.
        await tx.user.delete({ where: { id: userId } });
      },
      { timeout: 15000 },
    );
  }

  private async removeLegacyImage(value: string): Promise<void> {
    const webOrigin = new URL(this.config.get("WEB_ORIGIN", { infer: true }))
      .origin;
    let url: URL;
    try {
      url = new URL(value, webOrigin);
    } catch {
      return;
    }
    const origins = new Set([
      webOrigin,
      `http://localhost:${this.config.get("API_PORT", { infer: true })}`,
      this.config.get("UPLOADED_IMAGE_PUBLIC_ORIGIN", { infer: true }),
    ]);
    if (!origins.has(url.origin)) return;
    for (const [prefix, directory] of [
      [REVIEW_UPLOADS_URL_PREFIX, REVIEW_UPLOADS_DIR],
      [PROFILE_PHOTO_UPLOADS_URL_PREFIX, PROFILE_PHOTO_UPLOADS_DIR],
    ]) {
      if (!url.pathname.startsWith(prefix)) continue;
      const filename = url.pathname.slice(prefix.length);
      // Never turn a stored URL into an arbitrary filesystem path.
      if (
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:jpe?g|png|webp)$/i.test(
          filename,
        )
      )
        return;
      try {
        await unlink(join(directory, filename));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw new ServiceUnavailableException({
          code: "ACCOUNT_DELETION_FAILED",
          detail: "회원탈퇴를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
      }
    }
  }
}
