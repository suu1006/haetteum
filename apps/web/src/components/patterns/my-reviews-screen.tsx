"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import { MyReviewCard } from "@/components/travel/my-review-card";
import { MyReviewTabs } from "@/components/travel/my-review-tabs";
import { Button } from "@/components/ui/button";
import type {
  MyReviewsData,
  MyReviewsTabId,
} from "@/features/profile/my-reviews-model";

type MyReviewsScreenProps = {
  data: MyReviewsData;
};

const navigationItems = createMainNavigationItems("reviews");

const screenStyle = {
  "--reviews-navigation-height": "4.25rem",
  "--reviews-navigation-reserve":
    "calc(var(--reviews-navigation-height) + var(--safe-area-bottom) + 1.5rem)",
} as CSSProperties;

function MyReviewsScreen({ data }: MyReviewsScreenProps) {
  const [activeTab, setActiveTab] = useState<MyReviewsTabId>("written");
  const [message, setMessage] = useState("");
  const reviews = data[activeTab];
  const listLabel =
    activeTab === "written" ? "작성한 후기 목록" : "북마크한 후기 목록";

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[var(--reviews-navigation-reserve)]"
      style={screenStyle}
    >
      <header className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 px-6 pt-12 pb-4">
        <Link
          href="/mypage"
          aria-label="마이페이지로 돌아가기"
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-6" strokeWidth={1.8} />
        </Link>
        <h1 className="text-[1.55rem] leading-9 font-bold tracking-[-0.03em] text-foreground">
          내 후기
        </h1>
        <Button
          type="button"
          className="rounded-full px-5"
          onClick={() => setMessage("후기 작성 기능을 준비하고 있어요")}
        >
          작성하기
        </Button>
      </header>

      <main>
        <div className="px-6">
          <MyReviewTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <section
          id="my-reviews-panel"
          role="tabpanel"
          aria-labelledby={`my-reviews-${activeTab}-tab`}
          className="px-6 pt-5"
        >
          <ul aria-label={listLabel} className="grid gap-4">
            {reviews.map((review, index) => (
              <li key={review.id}>
                <MyReviewCard review={review} eager={index === 0} />
              </li>
            ))}
          </ul>
        </section>
        <p role="status" aria-live="polite" className="sr-only">
          {message}
        </p>
      </main>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto min-h-[var(--reviews-navigation-height)] w-full max-w-[30rem] bg-card">
        <BottomNavigation items={navigationItems} />
      </div>
    </div>
  );
}

export { MyReviewsScreen, type MyReviewsScreenProps };
