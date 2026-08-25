import { MapPinIcon } from "lucide-react";
import { SiGoogle, SiKakao, SiNaver } from "react-icons/si";

import type { ReviewProviderId } from "@/features/places/place-detail-model";
import { cn } from "@/lib/utils";

type ReviewProviderMarkProps = {
  provider: ReviewProviderId;
  compact?: boolean;
};

const providerConfig = {
  kakao: {
    label: "카카오맵",
    icon: SiKakao,
    className: "bg-[#FEE500] text-[#191919]",
  },
  google: {
    label: "구글맵",
    icon: SiGoogle,
    className: "border border-border bg-card text-foreground",
  },
  naver: {
    label: "네이버 블로그",
    icon: SiNaver,
    className: "bg-[#03C75A] text-white",
  },
} as const;

function ReviewProviderMark({
  provider,
  compact = false,
}: ReviewProviderMarkProps) {
  const config = providerConfig[provider];
  const Icon = config.icon;

  return (
    <span className="type-label inline-flex min-w-0 items-center gap-2 text-foreground">
      <span
        className={cn(
          "relative inline-flex size-6 shrink-0 items-center justify-center rounded-full",
          config.className,
        )}
        aria-hidden="true"
      >
        <Icon className="size-3.5" />
        {provider === "kakao" ? (
          <MapPinIcon className="absolute -right-1 -bottom-1 size-3 rounded-full bg-card p-0.5 text-primary shadow-card" />
        ) : null}
      </span>
      <span className={cn("truncate", compact && "sr-only")}>{config.label}</span>
    </span>
  );
}

export { ReviewProviderMark, type ReviewProviderMarkProps };
