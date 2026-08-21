import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { metadata } from "@/app/layout";

const pngAssets = [
  { file: "public/icons/favicon-16.png", width: 16, height: 16 },
  { file: "public/icons/favicon-32.png", width: 32, height: 32 },
  { file: "public/icons/favicon-48.png", width: 48, height: 48 },
  { file: "public/icons/apple-touch-icon.png", width: 180, height: 180 },
  { file: "public/icons/icon-192.png", width: 192, height: 192 },
  { file: "public/icons/icon-512.png", width: 512, height: 512 },
] as const;

function readPngSize(file: string) {
  const buffer = readFileSync(path.join(process.cwd(), file));

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

describe("app icons", () => {
  it.each(pngAssets)("provides $width×$height at $file", (asset) => {
    expect(existsSync(path.join(process.cwd(), asset.file))).toBe(true);

    if (existsSync(path.join(process.cwd(), asset.file))) {
      expect(readPngSize(asset.file)).toEqual({
        width: asset.width,
        height: asset.height,
      });
    }
  });

  it("publishes browser icons from the public directory", () => {
    expect(metadata.icons).toEqual({
      icon: [
        {
          url: "/icons/favicon-16.png",
          sizes: "16x16",
          type: "image/png",
        },
        {
          url: "/icons/favicon-32.png",
          sizes: "32x32",
          type: "image/png",
        },
        {
          url: "/icons/favicon-48.png",
          sizes: "48x48",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    });
  });

  it("publishes installable app icons in the web app manifest", async () => {
    const manifestPath = "../../../src/app/manifest";
    const manifestModule = await import(/* @vite-ignore */ manifestPath).catch(
      () => null,
    );

    expect(manifestModule).not.toBeNull();

    if (!manifestModule) {
      return;
    }

    expect(manifestModule.default().icons).toEqual([
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ]);
  });
});
