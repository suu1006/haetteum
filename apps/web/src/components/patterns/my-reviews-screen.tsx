"use client";

import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TbPlus } from "react-icons/tb";

import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { FavoritePlaceCard } from "@/components/travel/favorite-place-card";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import { MyReviewCard } from "@/components/travel/my-review-card";
import { MyReviewTabs } from "@/components/travel/my-review-tabs";
import {
  favoritesQueryOptions,
  useTogglePlaceFavorite,
} from "@/features/places/favorite-place-query";
import { deleteReview } from "@/features/profile/my-reviews-api";
import type {
  MyReviewItem,
  MyReviewsTabId,
} from "@/features/profile/my-reviews-model";

type MyReviewsScreenProps = {
  writtenReviews: readonly MyReviewItem[];
  writtenLoadState: "ready" | "error";
  bookmarkedLoadState: "ready" | "error";
  initialTab?: MyReviewsTabId;
};

const navigationItems = createMainNavigationItems("reviews");

const screenStyle = {
  "--reviews-navigation-height": "4.25rem",
  "--reviews-navigation-reserve":
    "calc(var(--reviews-navigation-height) + var(--safe-area-bottom) + 1.5rem)",
} as CSSProperties;

function MyReviewsScreen({
  writtenReviews,
  writtenLoadState,
  bookmarkedLoadState,
  initialTab = "written",
}: MyReviewsScreenProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MyReviewsTabId>(initialTab);
  const [writtenItems, setWrittenItems] =
    useState<readonly MyReviewItem[]>(writtenReviews);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const { data: favorites, isError: favoritesQueryFailed } = useQuery(
    favoritesQueryOptions(),
  );
  const toggleFavorite = useTogglePlaceFavorite();
  const bookmarkedItems = favorites?.items ?? [];

  const listLabel =
    activeTab === "written" ? "작성한 후기 목록" : "찜한 장소 목록";
  const showsWrittenError =
    activeTab === "written" && writtenLoadState === "error";
  const showsBookmarkedError =
    activeTab === "bookmarked" &&
    (bookmarkedLoadState === "error" || favoritesQueryFailed);
  const showsEmpty =
    activeTab === "written"
      ? !showsWrittenError && writtenItems.length === 0
      : !showsBookmarkedError && bookmarkedItems.length === 0;

  function editReview(id: string) {
    router.push(`/reviews/${id}/edit`);
  }

  async function removeReview(id: string) {
    setDeletingId(id);
    const result = await deleteReview(id);
    setDeletingId(null);

    if (result.status === "success") {
      setWrittenItems((current) => current.filter((item) => item.id !== id));
      setStatus("후기를 삭제했어요.");
      return;
    }

    setStatus(result.message);
  }

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
          {activeTab === "written" ? (
            showsWrittenError ? (
              <div role="alert" className="rounded-2xl bg-primary-subtle px-5 py-6">
                <p className="type-body-md font-semibold text-foreground">
                  후기를 불러오지 못했어요
                </p>
                <p className="type-caption mt-1 text-muted-foreground">
                  잠시 후 다시 시도해 주세요.
                </p>
              </div>
            ) : showsEmpty ? (
              <div className="rounded-2xl bg-primary-subtle px-5 py-6">
                <p className="type-body-md font-semibold text-foreground">
                  작성한 후기가 아직 없어요
                </p>
                <p className="type-caption mt-1 text-muted-foreground">
                  여행의 기억을 첫 후기로 남겨 보세요.
                </p>
              </div>
            ) : (
              <ul aria-label={listLabel} className="grid gap-4">
                {writtenItems.map((review, index) => (
                  <li key={review.id}>
                    <MyReviewCard
                      review={review}
                      eager={index < 3}
                      onEdit={editReview}
                      onDelete={removeReview}
                      deleting={deletingId === review.id}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : showsBookmarkedError ? (
            <div role="alert" className="rounded-2xl bg-primary-subtle px-5 py-6">
              <p className="type-body-md font-semibold text-foreground">
                찜한 장소를 불러오지 못했어요
              </p>
              <p className="type-caption mt-1 text-muted-foreground">
                잠시 후 다시 시도해 주세요.
              </p>
            </div>
          ) : showsEmpty ? (
            <div className="rounded-2xl bg-primary-subtle px-5 py-6">
              <p className="type-body-md font-semibold text-foreground">
                찜한 장소가 아직 없어요
              </p>
              <p className="type-caption mt-1 text-muted-foreground">
                관광지 상세 화면에서 하트를 눌러 찜해 보세요.
              </p>
            </div>
          ) : (
            <ul aria-label={listLabel} className="grid gap-4">
              {bookmarkedItems.map((item) => (
                <li key={item.id}>
                  <FavoritePlaceCard
                    item={item}
                    disabled={toggleFavorite.isPending}
                    onRemove={() =>
                      toggleFavorite.mutate({
                        placeId: item.id,
                        title: item.title,
                        location: item.location,
                        primaryImageUrl: item.primaryImageUrl,
                        nextFavorited: false,
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <p
          role="status"
          aria-label="후기 화면 상태"
          aria-live="polite"
          className="sr-only"
        >
          {status}
        </p>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--reviews-navigation-reserve)] z-40 mx-auto flex w-full max-w-[30rem] justify-end px-5 pb-1">
        <Link
          href="/reviews/new"
          aria-label="후기 작성하기"
          className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-floating outline-none transition-colors hover:bg-primary-pressed focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <TbPlus aria-hidden="true" className="size-7" strokeWidth={1.5} />
        </Link>
      </div>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] bg-card">
        <BottomNavigation items={navigationItems} />
      </div>
    </div>
  );
}

export { MyReviewsScreen, type MyReviewsScreenProps };
