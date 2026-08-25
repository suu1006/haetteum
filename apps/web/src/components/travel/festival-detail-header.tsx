"use client";

import { useState } from "react";
import { ChevronLeftIcon, HeartIcon, Share2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type FestivalDetailHeaderProps = {
  title: string;
};

function FestivalDetailHeader({ title }: FestivalDetailHeaderProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setShareStatus("공유했어요");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("링크를 복사했어요");
    } catch {
      setShareStatus("공유하지 못했어요");
    }
  }

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-border bg-card px-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="이전 페이지"
        onClick={handleBack}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      <p className="type-label pointer-events-none absolute inset-x-14 truncate text-center text-foreground">
        {title}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 aria-pressed:[&_svg]:fill-current"
          aria-label={saved ? "축제 찜 해제" : "축제 찜하기"}
          aria-pressed={saved}
          onClick={() => setSaved((current) => !current)}
        >
          <HeartIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="축제 공유"
          onClick={handleShare}
        >
          <Share2Icon aria-hidden="true" />
        </Button>
      </div>
      {shareStatus ? (
        <p
          role="status"
          className="type-caption absolute top-[calc(100%+0.5rem)] right-2 z-20 rounded-md bg-foreground px-3 py-2 text-background shadow-card"
        >
          {shareStatus}
        </p>
      ) : null}
    </header>
  );
}

export { FestivalDetailHeader, type FestivalDetailHeaderProps };
