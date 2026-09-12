import { getWeeklyThumbnailBaseUrl } from "@/lib/environment-contract";

/** Only prebuilt images under the configured storage prefix may bypass optimization. */
export function resolveWeeklyThumbnail(source: string | null): string | null {
  const configured = getWeeklyThumbnailBaseUrl();
  if (!source || !configured) return null;
  try {
    const base = new URL(configured);
    const image = new URL(source);
    const prefix = `${base.pathname.replace(/\/+$/, "")}/`;
    if (
      !["https:", "http:"].includes(base.protocol) ||
      base.username || base.password || base.search || base.hash ||
      image.origin !== base.origin || image.username || image.password ||
      image.search || image.hash || !image.pathname.startsWith(prefix) ||
      !image.pathname.endsWith(".webp")
    ) return null;
    return image.href;
  } catch {
    return null;
  }
}
