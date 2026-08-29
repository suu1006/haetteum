import { ExternalLinkIcon, MapIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

type FestivalDetailActionsProps = {
  homepage: string | null;
  mapUrl: string | null;
};

function FestivalDetailActions({
  homepage,
  mapUrl,
}: FestivalDetailActionsProps) {
  if (!homepage && !mapUrl) return null;

  return (
    <aside className="sticky-safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] border-t border-border bg-card px-4 pt-3 shadow-overlay">
      <div className="flex gap-4">
        {homepage ? (
          <a
            href={homepage}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              variant: "outline",
              className: "h-[52px] flex-1",
            })}
          >
            <ExternalLinkIcon aria-hidden="true" />
            홈페이지
          </a>
        ) : null}
        {mapUrl ? (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ className: "h-[52px] flex-1" })}
          >
            <MapIcon aria-hidden="true" />
            지도보기
          </a>
        ) : null}
      </div>
    </aside>
  );
}

export { FestivalDetailActions, type FestivalDetailActionsProps };
