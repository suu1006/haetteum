import type { Metadata } from "next";

import { WelcomeHero } from "@/components/patterns/welcome-hero";

export const metadata: Metadata = {
  title: "웰컴 | 해뜸",
  description: "여행지 순위, 통합 후기와 AI 맞춤 여행 코스를 만나보세요.",
};

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-background md:flex md:items-center md:justify-center md:p-8">
      <WelcomeHero />
    </main>
  );
}
