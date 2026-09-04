import { join } from "node:path";

export const REVIEW_UPLOADS_DIR = join(process.cwd(), "uploads", "reviews");
export const REVIEW_UPLOADS_URL_PREFIX = "/uploads/reviews/";
export const REVIEW_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
