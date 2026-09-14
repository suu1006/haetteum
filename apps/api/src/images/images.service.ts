import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnvironment } from "../config/environment.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ImageProcessor, type ImagePurpose } from "./image-processor.js";

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: ImageProcessor,
    private readonly config: ConfigService<ApiEnvironment, true>,
  ) {}

  private get base(): string {
    const configured = this.config.get("UPLOADED_IMAGE_PUBLIC_ORIGIN", {
      infer: true,
    });
    const origin =
      configured ??
      (this.config.get("NODE_ENV", { infer: true }) === "production"
        ? new URL(this.config.get("WEB_ORIGIN", { infer: true })).origin
        : `http://localhost:${this.config.get("API_PORT", { infer: true })}`);
    return `${origin.replace(/\/$/, "")}/api/v1/images/`;
  }

  async store(
    ownerId: string,
    file: Express.Multer.File,
    purpose: ImagePurpose,
  ): Promise<{ id: string; url: string }> {
    const image = await this.processor.convert(file, purpose);
    const row = await this.prisma.uploadedImage.create({
      data: {
        ownerId,
        purpose,
        ...image,
        data: new Uint8Array(image.data),
        byteSize: image.data.length,
      },
      select: { id: true },
    });
    return { id: row.id, url: `${this.base}${row.id}` };
  }

  async storeProfile(
    ownerId: string,
    file: Express.Multer.File,
  ): Promise<{ profileImageUrl: string }> {
    const image = await this.processor.convert(file, "PROFILE");
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.uploadedImage.create({
        data: {
          ownerId,
          purpose: "PROFILE",
          ...image,
          data: new Uint8Array(image.data),
          byteSize: image.data.length,
        },
        select: { id: true },
      });
      const profileImageUrl = `${this.base}${row.id}`;
      await tx.user.update({
        where: { id: ownerId },
        data: { profileImageId: row.id, profileImageUrl },
        select: { id: true },
      });
      return { profileImageUrl };
    });
  }

  async read(id: string): Promise<Buffer> {
    const image = await this.prisma.uploadedImage.findUnique({
      where: { id },
      select: { data: true },
    });
    if (!image)
      throw new NotFoundException({
        code: "IMAGE_NOT_FOUND",
        detail: "이미지를 찾을 수 없습니다.",
      });
    return Buffer.from(image.data);
  }

  async reviewAttachments(
    ownerId: string,
    urls: readonly string[],
    existing: readonly { url: string; uploadedImageId?: string | null }[] = [],
  ): Promise<
    { url: string; uploadedImageId: string | null; sortOrder: number }[]
  > {
    return Promise.all(
      urls.map(async (url, sortOrder) => {
        const retained = existing.find((image) => image.url === url);
        if (retained)
          return {
            url,
            uploadedImageId: retained.uploadedImageId ?? null,
            sortOrder,
          };
        const id = url.startsWith(this.base) ? url.slice(this.base.length) : "";
        if (
          !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
            id,
          )
        )
          throw this.invalidAttachment();
        const image = await this.prisma.uploadedImage.findFirst({
          where: { id, ownerId, purpose: "REVIEW" },
          select: { id: true },
        });
        if (!image) throw this.invalidAttachment();
        return {
          url: `${this.base}${image.id}`,
          uploadedImageId: image.id,
          sortOrder,
        };
      }),
    );
  }

  private invalidAttachment(): BadRequestException {
    return new BadRequestException({
      code: "INVALID_REVIEW_IMAGE",
      detail: "직접 업로드한 후기 사진만 첨부할 수 있어요.",
    });
  }
}
