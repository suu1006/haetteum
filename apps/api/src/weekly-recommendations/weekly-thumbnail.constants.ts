import { resolve } from "node:path";

export function weeklyThumbnailDirectory(): string {
  return resolve(process.env.WEEKLY_THUMBNAIL_DIR || "uploads/weekly");
}

export const WEEKLY_THUMBNAIL_MAX_BYTES = 8 * 1024 * 1024;
export const WEEKLY_THUMBNAIL_MAX_PIXELS = 24_000_000;
export const WEEKLY_THUMBNAIL_TIMEOUT_MS = 8_000;
