"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";

import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import { MyReviewCard } from "@/components/travel/my-review-card";
import { MyReviewTabs } from "@/components/travel/my-review-tabs";
import type {
  MyReviewsData,
  MyReviewsTabId,
} from "@/features/profile/my-reviews-model";

type MyReviewsScreenProps = {
  data: MyReviewsData;
  writtenLoadState: "ready" | "error";
};

const navigationItems = createMainNavigationItems("reviews");

const screenStyle = {
  "--reviews-navigation-height": "4.25rem",
  "--reviews-navigation-reserve":
    "calc(var(--reviews-navigation-height) + var(--safe-area-bottom) + 1.5rem)",
} as CSSProperties;

function MyReviewsScreen({
  data,
  writtenLoadState,
}: MyReviewsScreenProps) {
  const [activeTab, setActiveTab] = useState<MyReviewsTabId>("written");
  const reviews = data[activeTab];
  const listLabel =
    activeTab === "written" ? "작성한 후기 목록" : "북마크한 후기 목록";
  const showsWrittenError =
    activeTab === "written" && writtenLoadState === "error";
  const showsEmptyReviews = reviews.length === 0;

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[var(--reviews-navigation-reserve)]"
      style={screenStyle}
    >
      <header className="flex items-center justify-between gap-2 px-5 pt-[25px] pb-4">
        <h1 className="text-[1.55rem] leading-9 font-bold tracking-[-0.03em] text-foreground">
          내 후기
        </h1>
      </header>

      <main>
        <div className="px-5">
          <MyReviewTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <section
          id="my-reviews-panel"
          role="tabpanel"
          aria-labelledby={`my-reviews-${activeTab}-tab`}
          className="px-5 pt-5"
        >
          {showsWrittenError ? (
            <div role="alert" className="rounded-2xl bg-primary-subtle px-5 py-6">
              <p className="type-body-md font-semibold text-foreground">
                후기를 불러오지 못했어요
              </p>
              <p className="type-caption mt-1 text-muted-foreground">
                잠시 후 다시 시도해 주세요.
              </p>
            </div>
          ) : showsEmptyReviews ? (
            <div className="rounded-2xl bg-primary-subtle px-5 py-6">
              <p className="type-body-md font-semibold text-foreground">
                {activeTab === "written"
                  ? "작성한 후기가 아직 없어요"
                  : "북마크한 후기가 아직 없어요"}
              </p>
              <p className="type-caption mt-1 text-muted-foreground">
                {activeTab === "written"
                  ? "여행의 기억을 첫 후기로 남겨 보세요."
                  : "북마크 저장 기능은 준비하고 있어요."}
              </p>
            </div>
          ) : (
            <ul aria-label={listLabel} className="grid gap-4">
              {reviews.map((review, index) => (
                <li key={review.id}>
                  <MyReviewCard
                    review={review}
                    eager={index === 0}
                    editHref={
                      activeTab === "written"
                        ? `/reviews/${review.id}/edit`
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--reviews-navigation-reserve)] z-40 mx-auto flex w-full max-w-[30rem] justify-end px-5 pb-1">
        <Link
          href="/reviews/new"
          aria-label="후기 작성하기"
          className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-primary text-[2rem] leading-none font-light text-primary-foreground shadow-floating outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <span aria-hidden="true">+</span>
        </Link>
      </div>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto min-h-[var(--reviews-navigation-height)] w-full max-w-[30rem] bg-card">
        <BottomNavigation items={navigationItems} />
      </div>
    </div>
  );
}

export { MyReviewsScreen, type MyReviewsScreenProps };
