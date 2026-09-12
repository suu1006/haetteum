import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import {
  weeklyThumbnailDirectory,
  WEEKLY_THUMBNAIL_MAX_BYTES,
  WEEKLY_THUMBNAIL_MAX_PIXELS,
  WEEKLY_THUMBNAIL_TIMEOUT_MS,
} from "./weekly-thumbnail.constants.js";

function publicBase(): string {
  const value = process.env.WEEKLY_THUMBNAIL_PUBLIC_BASE_URL;
  if (!value) throw new Error("WEEKLY_THUMBNAIL_PUBLIC_BASE_URL_REQUIRED");
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, "") !== "/uploads/weekly"
  ) {
    throw new Error("INVALID_WEEKLY_THUMBNAIL_PUBLIC_BASE_URL");
  }
  return url.href.replace(/\/$/, "");
}

async function download(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    WEEKLY_THUMBNAIL_TIMEOUT_MS,
  );
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: controller.signal,
    });
    if (
      !response.ok ||
      !response.body ||
      Number(response.headers.get("content-length")) >
        WEEKLY_THUMBNAIL_MAX_BYTES
    )
      throw new Error("INVALID_IMAGE_RESPONSE");
    reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let length = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > WEEKLY_THUMBNAIL_MAX_BYTES)
        throw new Error("IMAGE_TOO_LARGE");
      chunks.push(Buffer.from(chunk.value));
    }
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    await reader?.cancel().catch(() => undefined);
    controller.abort();
  }
}

@Injectable()
export class WeeklyThumbnailService {
  async prepare(input: {
    placeId: string;
    urls: readonly { url: string; copyrightType: string | null }[];
  }): Promise<{ url: string; copyrightType: string }> {
    const base = publicBase();
    // Type3/Type4 prohibit derivatives; Type2 prohibits commercial reuse.
    for (const source of input.urls
      .filter((source) => source.copyrightType === "Type1")
      .slice(0, 8)) {
      if (source.copyrightType !== "Type1") continue;
      let bytes: Buffer;
      try {
        const url = new URL(source.url);
        if (
          url.protocol === "http:" &&
          url.hostname === "tong.visitkorea.or.kr"
        )
          url.protocol = "https:";
        if (
          url.protocol !== "https:" ||
          url.hostname !== "tong.visitkorea.or.kr" ||
          url.port ||
          url.username ||
          url.password
        )
          continue;
        const original = await download(url.href);
        const decoder = sharp(original, {
          limitInputPixels: WEEKLY_THUMBNAIL_MAX_PIXELS,
          failOn: "warning",
        });
        const metadata = await decoder.metadata();
        if (
          !metadata.width ||
          !metadata.height ||
          metadata.width < 320 ||
          metadata.height < 320 ||
          (metadata.pages ?? 1) !== 1 ||
          !["jpeg", "png", "webp"].includes(metadata.format ?? "")
        )
          continue;
        bytes = await decoder
          .rotate()
          .resize(480, 480, { fit: "cover" })
          .webp({ quality: 82 })
          .toBuffer();
      } catch {
        continue;
      }
      const name = `${createHash("sha256").update(bytes).digest("hex")}.webp`;
      const directory = weeklyThumbnailDirectory();
      await mkdir(directory, { recursive: true });
      const temporary = join(directory, `.${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, bytes, { flag: "wx" });
        await rename(temporary, join(directory, name));
      } finally {
        await unlink(temporary).catch(() => undefined);
      }
      const url = `${base}/${name}`;
      if (await this.verify(url))
        return { url, copyrightType: source.copyrightType };
    }
    throw new Error("NO_ELIGIBLE_THUMBNAIL");
  }

  async verify(value: string): Promise<boolean> {
    try {
      const base = publicBase();
      if (
        !value.startsWith(`${base}/`) ||
        !/^[a-f0-9]{64}\.webp$/.test(value.slice(base.length + 1))
      )
        return false;
      const bytes = await download(value);
      if (
        createHash("sha256").update(bytes).digest("hex") !==
        value.slice(base.length + 1, -5)
      )
        return false;
      const decoder = sharp(bytes, {
        limitInputPixels: WEEKLY_THUMBNAIL_MAX_PIXELS,
        failOn: "warning",
      });
      const metadata = await decoder.metadata();
      if (
        metadata.format !== "webp" ||
        metadata.width !== 480 ||
        metadata.height !== 480 ||
        (metadata.pages ?? 1) !== 1
      )
        return false;
      await decoder.raw().toBuffer();
      return true;
    } catch {
      return false;
    }
  }
}
