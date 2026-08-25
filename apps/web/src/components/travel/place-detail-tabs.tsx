import Link from "next/link";

import {
  buildPlaceDetailHref,
  type PlaceDetailTabId,
} from "@/features/places/place-detail-model";
import { cn } from "@/lib/utils";

type PlaceDetailTabsProps = {
  placeId: string;
  currentTab: PlaceDetailTabId;
};

const tabs = [
  { id: "introduction", label: "소개" },
  { id: "course", label: "코스 추천" },
  { id: "reviews", label: "후기" },
  { id: "information", label: "정보" },
] as const;

function PlaceDetailTabs({ placeId, currentTab }: PlaceDetailTabsProps) {
  return (
    <nav aria-label="장소 상세 탭" className="border-b border-border bg-card">
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const current = tab.id === currentTab;

          return (
            <li key={tab.id}>
              <Link
                href={buildPlaceDetailHref(placeId, {
                  tab: tab.id,
                  source: "all",
                })}
                replace
                aria-current={current ? "page" : undefined}
                className={cn(
                  "type-label relative flex min-h-14 items-center justify-center px-1 text-center text-muted-foreground outline-none transition-colors focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/25",
                  current &&
                    "font-semibold text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { PlaceDetailTabs, type PlaceDetailTabsProps };
