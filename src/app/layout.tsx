import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haetteum",
  description: "Haetteum web application",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
