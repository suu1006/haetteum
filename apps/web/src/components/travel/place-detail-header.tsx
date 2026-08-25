"use client";

import { ArrowLeftIcon, HeartIcon, Share2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlaceDetailHeaderProps = {
  title: string;
};

function PlaceDetailHeader({ title }: PlaceDetailHeaderProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  function handleBack() {
    router.replace("/");
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
          onClick={() => setSaved((current) => !current)}
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
