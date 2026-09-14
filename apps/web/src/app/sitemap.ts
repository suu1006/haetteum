import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only stable public entry pages; do not fabricate detail IDs or modified dates.
  return ["/", "/explore"].map(path => ({ url: `${siteUrl}${path}`, changeFrequency: "daily", priority: path === "/" ? 1 : 0.8 }));
}
