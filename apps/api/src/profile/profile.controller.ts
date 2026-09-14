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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import {
  acceptsImageMime,
  IMAGE_MAX_BYTES,
  unsupportedImage,
} from "../images/image-processor.js";
import { ProfilePhotoStorageService } from "./profile-photo-storage.service.js";
import { ProfileService } from "./profile.service.js";

@Controller({ path: "profile", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly photoStorage: ProfilePhotoStorageService,
  ) {}

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
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!acceptsImageMime(file.mimetype, "PROFILE")) {
          callback(unsupportedImage(), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadPhoto(
    @CurrentUser() currentUser: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ProfilePhotoResponse> {
    if (!file) {
      throw new BadRequestException({
        code: "IMAGE_FILE_REQUIRED",
        detail: "업로드할 이미지 파일이 필요해요.",
      });
    }

    return ProfilePhotoResponseSchema.parse(
      await this.photoStorage.store(currentUser.id, file),
    );
  }
}
