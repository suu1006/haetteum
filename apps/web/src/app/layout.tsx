import { WebVitals } from "@/features/performance/web-vitals";
import { siteUrl } from "@/lib/seo";
import type { Metadata } from "next";
import "./globals.css";

import { AuthBootstrap } from "@/features/auth/auth-bootstrap";
import { AuthStoreProvider } from "@/features/auth/auth-store";
import { QueryProvider } from "@/features/query/query-provider";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "해뜸",
  description: "인기 관광지와 축제를 살펴보고 나만의 여행 코스를 만들어 보세요.",
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <WebVitals />
        <QueryProvider>
          <AuthStoreProvider>
            <AuthBootstrap />
            {children}
          </AuthStoreProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
