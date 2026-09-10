import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import {
  ProfilePhotoResponseSchema,
  ProfilePreferencesResponseSchema,
  UpdateProfilePreferencesRequestSchema,
  type AuthUser,
  type ProfilePhotoResponse,
  type ProfilePreferencesResponse,
  type UpdateProfilePreferencesRequest,
} from "@haetteum/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import type { Request } from "express";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import {
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_UPLOADS_DIR,
} from "./profile-photo.constants.js";
import { ProfileService } from "./profile.service.js";

const ALLOWED_EXTENSIONS: Record<string, true> = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};

@Controller({ path: "profile", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch()
  async updatePreferences(
    @CurrentUser() currentUser: AuthUser,
    @Body(new ZodValidationPipe(UpdateProfilePreferencesRequestSchema))
    input: UpdateProfilePreferencesRequest,
  ): Promise<ProfilePreferencesResponse> {
    return ProfilePreferencesResponseSchema.parse(
      await this.profile.updatePreferences(currentUser.id, input),
    );
  }

  @Post("photo")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: PROFILE_PHOTO_UPLOADS_DIR,
        filename: (_request, file, callback) => {
          const ext = extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: PROFILE_PHOTO_MAX_BYTES, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_EXTENSIONS[file.mimetype]) {
          callback(
            new BadRequestException({
              code: "UNSUPPORTED_IMAGE_TYPE",
              detail: "jpg, png, webp 형식의 이미지만 업로드할 수 있어요.",
            }),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadPhoto(
    @CurrentUser() currentUser: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ): Promise<ProfilePhotoResponse> {
    if (!file) {
      throw new BadRequestException({
        code: "IMAGE_FILE_REQUIRED",
        detail: "업로드할 이미지 파일이 필요해요.",
      });
    }

    const origin = `${request.protocol}://${request.get("host")}`;
    const profileImageUrl = `${origin}/uploads/profile-photos/${file.filename}`;

    return ProfilePhotoResponseSchema.parse(
      await this.profile.updatePhoto(currentUser.id, profileImageUrl),
    );
  }
}
