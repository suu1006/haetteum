import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { DiscoveryContent } from "@/features/discovery/discovery-content";
import type { DiscoverySearchParams } from "@/features/discovery/discovery-model";

export const metadata: Metadata = {
  title: "여행 탐색 | 해뜸",
  description: "인기 관광지와 축제를 살펴보고 AI 여행 코스를 추천받아 보세요.",
};

export default function Home({
  searchParams,
}: {
  searchParams: Promise<DiscoverySearchParams>;
}) {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<p className="sr-only">여행 정보를 불러오는 중</p>}>
        <DiscoveryContent searchParams={searchParams} />
      </Suspense>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+var(--safe-area-bottom))] z-30 mx-auto flex w-full max-w-[30rem] justify-end px-4">
        <Link
          href="/chat"
          aria-label="여행 챗봇 열기"
          className="pointer-events-auto block size-16 overflow-hidden rounded-full bg-white shadow-overlay outline-none transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <Image
            src="/images/haetteum-chatbot-icon.svg"
            alt=""
            width={64}
            height={64}
            unoptimized
            className="scale-125"
          />
        </Link>
      </div>
    </main>
  );
}
