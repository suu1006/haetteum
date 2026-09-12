import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import type { Request } from "express";

import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import {
  REVIEW_IMAGE_MAX_BYTES,
  REVIEW_UPLOADS_DIR,
} from "./review-images.constants.js";

const ALLOWED_EXTENSIONS: Record<string, true> = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};

@Controller({ path: "reviews/images", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class ReviewImagesController {
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: REVIEW_UPLOADS_DIR,
        filename: (_request, file, callback) => {
          const ext = extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: REVIEW_IMAGE_MAX_BYTES, files: 1 },
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
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ): { url: string } {
    if (!file) {
      throw new BadRequestException({
        code: "IMAGE_FILE_REQUIRED",
        detail: "업로드할 이미지 파일이 필요해요.",
      });
    }

    const origin = `${request.protocol}://${request.get("host")}`;
    return { url: `${origin}/uploads/reviews/${file.filename}` };
  }
}
