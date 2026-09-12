import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import sharp from "sharp";
import { WeeklyThumbnailService } from "./weekly-thumbnail.service.js";

describe("WeeklyThumbnailService", () => {
  let dir: string;
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "weekly-test-"));
    process.env.WEEKLY_THUMBNAIL_DIR = dir;
    process.env.WEEKLY_THUMBNAIL_PUBLIC_BASE_URL =
      "https://cdn.example.com/uploads/weekly";
  });
  afterEach(async () => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    await rm(dir, { recursive: true, force: true });
  });
  const input = (
    url = "https://tong.visitkorea.or.kr/image.jpg",
    copyrightType: string | null = "Type1",
  ) => ({ placeId: "place", urls: [{ url, copyrightType }] });
  const picture = (width = 640, height = 400) =>
    sharp({ create: { width, height, channels: 3, background: "red" } })
      .png()
      .toBuffer();
  it("writes a decoded square WebP and verifies the public bytes", async () => {
    const source = await picture();
    global.fetch = jest
      .fn<typeof fetch>()
      .mockImplementation(
        async (url) =>
          new Response(
            new Uint8Array(
              (url as string).includes("cdn.example")
                ? await readFile(join(dir, basename(url as string)))
                : source,
            ),
          ),
      );
    const service = new WeeklyThumbnailService();
    const result = await service.prepare(input());
    expect(result.copyrightType).toBe("Type1");
    expect(result.url).toMatch(
      /^https:\/\/cdn.example.com\/uploads\/weekly\/[a-f0-9]{64}\.webp$/,
    );
    expect(
      await sharp(await readFile(join(dir, basename(result.url)))).metadata(),
    ).toMatchObject({ format: "webp", width: 480, height: 480 });
    expect(await service.verify(result.url)).toBe(true);
  });
  it("upgrades legacy official HTTP images before downloading", async () => {
    const source = await picture();
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockImplementation(
        async (url) =>
          new Response(
            new Uint8Array(
              (url as string).includes("cdn.example")
                ? await readFile(join(dir, basename(url as string)))
                : source,
            ),
          ),
      );
    global.fetch = fetchMock;
    await new WeeklyThumbnailService().prepare(
      input("http://tong.visitkorea.or.kr/image.jpg"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tong.visitkorea.or.kr/image.jpg",
      expect.any(Object),
    );
  });
  it("finds an eligible image after eight unsupported licenses", async () => {
    const source = await picture();
    global.fetch = jest
      .fn<typeof fetch>()
      .mockImplementation(
        async (url) =>
          new Response(
            new Uint8Array(
              (url as string).includes("cdn.example")
                ? await readFile(join(dir, basename(url as string)))
                : source,
            ),
          ),
      );
    const result = await new WeeklyThumbnailService().prepare({
      placeId: "place",
      urls: [
        ...Array.from({ length: 8 }, () => ({
          url: "https://tong.visitkorea.or.kr/restricted.jpg",
          copyrightType: "Type3",
        })),
        {
          url: "https://tong.visitkorea.or.kr/allowed.jpg",
          copyrightType: "Type1",
        },
      ],
    });
    expect(await new WeeklyThumbnailService().verify(result.url)).toBe(true);
  });
  it.each(["Type2", "Type3", "Type4", null])(
    "rejects unsupported copyright %s",
    async (code) => {
      await expect(
        new WeeklyThumbnailService().prepare(input(undefined, code)),
      ).rejects.toThrow("NO_ELIGIBLE_THUMBNAIL");
    },
  );
  it.each([
    "http://tong.visitkorea.or.kr/a",
    "https://evil.example/a",
    "https://tong.visitkorea.or.kr@evil.example/a",
  ])("rejects untrusted source %s", async (url) => {
    await expect(
      new WeeklyThumbnailService().prepare(input(url)),
    ).rejects.toThrow("NO_ELIGIBLE_THUMBNAIL");
  });
  it.each(["small", "corrupt", "oversized", "redirect"])(
    "rejects %s responses",
    async (kind) => {
      const body =
        kind === "small" ? await picture(319, 400) : Buffer.from("invalid");
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue(
        new Response(new Uint8Array(body), {
          status: kind === "redirect" ? 302 : 200,
          headers:
            kind === "oversized" ? { "content-length": "999999999" } : {},
        }),
      );
      await expect(
        new WeeklyThumbnailService().prepare(input()),
      ).rejects.toThrow("NO_ELIGIBLE_THUMBNAIL");
    },
  );
  it("does not trust an arbitrary verification URL or corrupt public bytes", async () => {
    global.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("corrupt"));
    const service = new WeeklyThumbnailService();
    expect(await service.verify("https://evil.example/a.webp")).toBe(false);
    expect(
      await service.verify(
        `https://cdn.example.com/uploads/weekly/${"a".repeat(64)}.webp`,
      ),
    ).toBe(false);
  });
});
