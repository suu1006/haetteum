import type { Metadata } from "next";
import "./globals.css";

import { AuthBootstrap } from "@/features/auth/auth-bootstrap";
import { AuthStoreProvider } from "@/features/auth/auth-store";
import { QueryProvider } from "@/features/query/query-provider";

export const metadata: Metadata = {
  title: "해뜸",
  description: "Haetteum web application",
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
