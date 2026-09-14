import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from "@nestjs/common";
import convertHeic from "heic-convert";
import sharp from "sharp";

export type ImagePurpose = "REVIEW" | "PROFILE";
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const FORMATS: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heif",
  "image/heif": "heif",
};

export function acceptsImageMime(mime: string, purpose: ImagePurpose): boolean {
  return (
    Object.hasOwn(FORMATS, mime) &&
    (purpose === "PROFILE" || FORMATS[mime] !== "heif")
  );
}

export function unsupportedImage(): BadRequestException {
  return new BadRequestException({
    code: "UNSUPPORTED_IMAGE_TYPE",
    detail:
      "이미지를 처리할 수 없어요. 지원하는 형식의 사진으로 다시 시도해 주세요.",
  });
}

@Injectable()
export class ImageProcessor {
  async convert(
    file: Express.Multer.File,
    purpose: ImagePurpose,
  ): Promise<{ data: Buffer; width: number; height: number }> {
    if (file.buffer.length > IMAGE_MAX_BYTES) {
      throw new PayloadTooLargeException({
        code: "IMAGE_TOO_LARGE",
        detail: "사진은 5MB 이하로 업로드해 주세요.",
      });
    }
    if (!acceptsImageMime(file.mimetype, purpose)) throw unsupportedImage();
    try {
      const options = {
        limitInputPixels: MAX_PIXELS,
        failOn: "warning" as const,
      };
      const metadata = await sharp(file.buffer, options).metadata();
      if (
        !metadata.width ||
        !metadata.height ||
        metadata.format !== FORMATS[file.mimetype] ||
        (metadata.pages ?? 1) !== 1
      ) {
        throw unsupportedImage();
      }
      if (metadata.width * metadata.height > MAX_PIXELS)
        throw new Error("pixel limit");
      // Read the HEIF header with Sharp before allocating the fallback decoder's pixels.
      const bytes =
        metadata.format === "heif"
          ? Buffer.from(
              await convertHeic({
                buffer: file.buffer,
                format: "JPEG",
                quality: 0.9,
              }),
            )
          : file.buffer;
      const edge = purpose === "PROFILE" ? 512 : 2048;
      const result = await sharp(bytes, options)
        .rotate()
        .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .timeout({ seconds: 10 })
        .toBuffer({ resolveWithObject: true });
      if (result.data.length > IMAGE_MAX_BYTES)
        throw new PayloadTooLargeException();
      return {
        data: result.data,
        width: result.info.width,
        height: result.info.height,
      };
    } catch (error) {
      if (error instanceof PayloadTooLargeException) throw error;
      if (error instanceof Error && /pixel limit/i.test(error.message)) {
        throw new BadRequestException({
          code: "IMAGE_RESOLUTION_EXCEEDED",
          detail: "사진의 해상도는 4천만 픽셀 이하여야 해요.",
        });
      }
      throw unsupportedImage();
    }
  }
}
