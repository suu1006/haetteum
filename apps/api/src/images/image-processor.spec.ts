import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { ImageProcessor } from "./image-processor.js";

function file(buffer: Buffer, mimetype = "image/png") {
  return {
    buffer,
    mimetype,
    size: buffer.length,
    originalname: "untrusted.html",
  } as Express.Multer.File;
}

describe("ImageProcessor", () => {
  const processor = new ImageProcessor();

  it.each(["jpeg", "png", "webp"] as const)(
    "decodes %s and produces bounded WebP bytes without EXIF",
    async (format) => {
      const input = await sharp({
        create: { width: 2400, height: 1200, channels: 3, background: "red" },
      })
        .withMetadata({ orientation: 6 })
        .toFormat(format)
        .toBuffer();
      const output = await processor.convert(
        file(input, `image/${format}`),
        "REVIEW",
      );
      const metadata = await sharp(output.data).metadata();
      expect(metadata).toMatchObject({
        format: "webp",
        width: 1024,
        height: 2048,
      });
      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(output.width).toBe(1024);
      expect(output.height).toBe(2048);
      expect(Buffer.isBuffer(output.data)).toBe(true);
    },
  );

  it("resizes profiles to 512px without upscaling small images", async () => {
    for (const [width, expected] of [
      [1024, 512],
      [8, 8],
    ]) {
      const input = await sharp({
        create: { width, height: width, channels: 3, background: "blue" },
      })
        .png()
        .toBuffer();
      const output = await processor.convert(file(input), "PROFILE");
      expect(output.width).toBe(expected);
      expect(output.height).toBe(expected);
    }
  });

  it("rejects a fake image and an SVG disguised as PNG", async () => {
    for (const value of [
      "not an image",
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    ]) {
      await expect(
        processor.convert(file(Buffer.from(value)), "REVIEW"),
      ).rejects.toMatchObject({ response: { code: "UNSUPPORTED_IMAGE_TYPE" } });
    }
  });

  it("rejects a valid PNG claimed as JPEG", async () => {
    const input = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    await expect(
      processor.convert(file(input, "image/jpeg"), "REVIEW"),
    ).rejects.toMatchObject({ response: { code: "UNSUPPORTED_IMAGE_TYPE" } });
  });

  it("rejects over 5 MiB before decoding", async () => {
    await expect(
      processor.convert(file(Buffer.alloc(5 * 1024 * 1024 + 1)), "REVIEW"),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("rejects an image over 40 million pixels even when its compressed bytes are small", async () => {
    const input = await sharp({
      create: { width: 8000, height: 5001, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(
      processor.convert(file(input), "REVIEW"),
    ).rejects.toMatchObject({
      response: { code: "IMAGE_RESOLUTION_EXCEEDED" },
    });
  });

  it("converts the existing HEIC profile fixture to WebP, but refuses HEIC for reviews", async () => {
    const input = await readFile(
      new URL("../profile/__fixtures__/sample.heic", import.meta.url),
    );
    const output = await processor.convert(
      file(input, "image/heic"),
      "PROFILE",
    );
    expect(await sharp(output.data).metadata()).toMatchObject({
      format: "webp",
      width: 200,
      height: 200,
    });
    await expect(
      processor.convert(file(input, "image/heic"), "REVIEW"),
    ).rejects.toMatchObject({ response: { code: "UNSUPPORTED_IMAGE_TYPE" } });
  });
  it("rejects animated WebP rather than silently storing one frame", async () => {
    const frames = Buffer.alloc(8 * 16 * 3);
    frames.fill(255, 8 * 8 * 3);
    const input = await sharp(frames, {
      raw: { width: 8, height: 16, channels: 3, pageHeight: 8 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    expect((await sharp(input).metadata()).pages).toBe(2);
    await expect(
      processor.convert(file(input, "image/webp"), "REVIEW"),
    ).rejects.toMatchObject({ response: { code: "UNSUPPORTED_IMAGE_TYPE" } });
  });
});
