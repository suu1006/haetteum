"use client";

import Image from "next/image";
import { useState } from "react";
import { resolvePlacePhotoSource } from "@/lib/official-image";
import { cn } from "@/lib/utils";

type RankingCardPhotoProps = {
  source: string | null;
  title: string;
  rank: number;
  priority: boolean;
  hideImage?: boolean;
  onImageError?: () => void;
};
const badgeStyles: Record<number, string> = {
  1: "bg-rank-gold text-rank-gold-foreground",
  2: "bg-rank-silver text-rank-silver-foreground",
  3: "bg-rank-bronze text-rank-bronze-foreground",
};
export function RankingCardPhoto({
  source,
  title,
  rank,
  priority,
  hideImage,
  onImageError,
}: RankingCardPhotoProps) {
  const src = resolvePlacePhotoSource(source);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const visible = src !== null && src !== failedSource && !hideImage;
  return (
    <div
      className={
        visible
          ? "relative aspect-[4/5] overflow-hidden rounded-lg bg-primary-subtle"
          : "py-1"
      }
    >
      {visible && (
        <Image
          src={src}
          alt={title}
          fill
          sizes="(max-width: 480px) 30vw, 144px"
          className="object-cover"
          priority={priority}
          onError={() => {
            setFailedSource(src);
            onImageError?.();
          }}
        />
      )}
      <span
        className={cn(
          "type-caption inline-block rounded-full px-2 py-0.5 font-semibold",
          visible && "absolute top-1.5 left-1.5",
          badgeStyles[rank] ?? "bg-primary text-primary-foreground",
        )}
      >
        {rank}위
      </span>
    </div>
  );
}
