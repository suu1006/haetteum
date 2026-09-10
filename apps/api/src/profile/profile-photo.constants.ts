import { join } from "node:path";

export const PROFILE_PHOTO_UPLOADS_DIR = join(
  process.cwd(),
  "uploads",
  "profile-photos",
);
export const PROFILE_PHOTO_UPLOADS_URL_PREFIX = "/uploads/profile-photos/";
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
