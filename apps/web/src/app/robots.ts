import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/web-vitals", "/chat", "/mypage", "/trips", "/reviews", "/login", "/signup", "/design-system", "/*/edit", "/*?*q="] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
