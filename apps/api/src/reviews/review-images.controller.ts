import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { AuthUser } from "@haetteum/contracts";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import {
  acceptsImageMime,
  IMAGE_MAX_BYTES,
  unsupportedImage,
} from "../images/image-processor.js";
import { ImagesService } from "../images/images.service.js";

@Controller({ path: "reviews/images", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class ReviewImagesController {
  constructor(private readonly images: ImagesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!acceptsImageMime(file.mimetype, "REVIEW")) {
          callback(unsupportedImage(), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<{ url: string }> {
    if (!file)
      throw new BadRequestException({
        code: "IMAGE_FILE_REQUIRED",
        detail: "업로드할 이미지 파일이 필요해요.",
      });
    const { url } = await this.images.store(user.id, file, "REVIEW");
    return { url };
  }
}
