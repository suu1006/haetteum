import Link from "next/link";

import {
  buildPlaceDetailHref,
  type ReviewSourceId,
} from "@/features/places/place-detail-model";
import { cn } from "@/lib/utils";

type ReviewSourceFilterProps = {
  placeId: string;
  currentSource: ReviewSourceId;
};

const sources = [
  { id: "all", label: "전체" },
  { id: "kakao", label: "카카오맵" },
  { id: "google", label: "구글맵" },
  { id: "naver", label: "네이버 블로그" },
] as const;

function ReviewSourceFilter({
  placeId,
  currentSource,
}: ReviewSourceFilterProps) {
  return (
    <nav aria-label="후기 출처 필터" className="scrollbar-none overflow-x-auto">
      <ul className="flex min-w-max gap-2 py-1">
        {sources.map((source) => {
          const current = source.id === currentSource;

          return (
            <li key={source.id}>
              <Link
                href={buildPlaceDetailHref(placeId, {
                  tab: "reviews",
                  source: source.id,
                })}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "type-label inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card px-4 text-muted-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/25",
                  current &&
                    "border-primary bg-primary-subtle font-semibold text-primary",
                )}
              >
                {source.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { ReviewSourceFilter, type ReviewSourceFilterProps };
