"use client";

import { ArrowLeftIcon, HeartIcon, Share2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { safeReturnTo } from "@/features/auth/auth-model";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  useIsPlaceFavorited,
  useTogglePlaceFavorite,
} from "@/features/places/favorite-place-query";

type PlaceDetailHeaderProps = {
  title: string;
  placeId?: string;
  location?: string;
  primaryImageUrl?: string | null;
};

function PlaceDetailHeader({
  title,
  placeId,
  location = "",
  primaryImageUrl = null,
}: PlaceDetailHeaderProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const isAuthenticated = useAuthStore((state) => state.status === "authenticated");
  const saved = useIsPlaceFavorited(
    placeId ?? "",
    Boolean(placeId) && isAuthenticated,
  );
  const toggleFavorite = useTogglePlaceFavorite();

  function handleBack() {
    router.replace("/");
  }

  function handleToggleSaved() {
    if (!placeId) return;

    if (!isAuthenticated) {
      const returnTo = safeReturnTo(
        `${window.location.pathname}${window.location.search}`,
      );
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    toggleFavorite.mutate(
      { placeId, title, location, primaryImageUrl, nextFavorited: !saved },
      {
        onError: () =>
          setMessage(
            saved ? "찜 해제에 실패했어요" : "찜하기에 실패했어요",
          ),
      },
    );
  }

  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setMessage("공유 화면을 열었어요");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했어요");
    } catch {
      setMessage("링크를 공유하지 못했어요");
    }
  }

  return (
    <header className="grid min-h-14 grid-cols-[2.75rem_minmax(0,1fr)_5.5rem] items-center gap-2 px-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="뒤로가기"
        onClick={handleBack}
      >
        <ArrowLeftIcon aria-hidden="true" />
      </Button>
      <h1 className="type-title-md truncate text-center text-foreground">
        {title}
      </h1>
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={saved ? `${title} 찜 해제` : `${title} 찜하기`}
          aria-pressed={saved}
          disabled={!placeId || toggleFavorite.isPending}
          onClick={handleToggleSaved}
        >
          <HeartIcon
            className={cn(saved && "fill-current text-primary")}
            aria-hidden="true"
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="공유하기"
          onClick={handleShare}
        >
          <Share2Icon aria-hidden="true" />
        </Button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {message}
      </p>
    </header>
  );
}

export { PlaceDetailHeader, type PlaceDetailHeaderProps };
