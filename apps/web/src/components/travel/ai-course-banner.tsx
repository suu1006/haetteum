"use client";

import Image from "next/image";
import { SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type AiCourseBannerProps = {
  imageSrc: string;
  imageAlt: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  loadingLabel?: string;
  onRecommend: () => void;
  loading?: boolean;
  disabled?: boolean;
};

function AiCourseBanner({
  imageSrc,
  imageAlt,
  eyebrow = "",
  title = "AI가 추천하는 맞춤 여행 코스",
  description = "당신의 취향에 맞는 완벽한 여행 계획",
  buttonLabel = "코스 추천받기",
  loadingLabel = "코스를 찾는 중…",
  onRecommend,
  loading = false,
  disabled = false,
}: AiCourseBannerProps) {
  return (
    <section className="relative min-h-32 overflow-hidden rounded-lg bg-primary-subtle">
      <div className="absolute inset-y-0 right-0 w-[38%]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 640px) 38vw, 182px"
          className="object-contain object-right-bottom"
        />
      </div>
      <div className="relative z-10 flex min-h-32 w-[68%] flex-col justify-center gap-2 px-4 py-3 pr-0">
        {eyebrow ? (
          <div className="inline-flex items-center gap-1.5 text-primary">
            <SparklesIcon className="size-4" aria-hidden="true" />
            <span className="type-caption font-semibold">{eyebrow}</span>
          </div>
        ) : null}
        <div className="space-y-1">
          <h2 className="type-label text-foreground">{title}</h2>
          <p className="type-caption text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onRecommend}
            disabled={disabled || loading}
          >
            {loading ? loadingLabel : buttonLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}

export { AiCourseBanner, type AiCourseBannerProps };
