import type { Metadata } from "next";

export const siteUrl = "https://haetteum.kr";
export function publicMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "해뜸", locale: "ko_KR", type: "website", images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "해뜸" }] },
    twitter: { card: "summary", title, description, images: ["/icons/icon-512.png"] },
  };
}
