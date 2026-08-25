import { BellIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type DiscoveryAppHeaderProps = {
  compact?: boolean;
};

function DiscoveryAppHeader({ compact = false }: DiscoveryAppHeaderProps) {
  return (
    <header
      className={cn(
        "bg-card px-5",
        compact ? "pt-4 pb-2" : "pt-[25px] pb-3",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "type-caption" : "type-label",
            )}
          >
            여행자님, 반가워요
          </p>
          <h1
            className={cn(
              "mt-1 break-keep text-foreground",
              compact ? "type-title-md" : "type-title-lg",
            )}
          >
            어디로 떠나볼까요?
          </h1>
        </div>
        <button
          type="button"
          aria-label="알림"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary-subtle hover:text-primary"
        >
          <BellIcon className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export { DiscoveryAppHeader, type DiscoveryAppHeaderProps };
