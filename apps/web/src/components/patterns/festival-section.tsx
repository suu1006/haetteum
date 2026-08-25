import Link from "next/link";

import { FestivalListItem } from "@/components/travel/festival-list-item";
import {
  buildDiscoveryHref,
  defaultDiscoveryQuery,
  type DiscoveryQuery,
  type FestivalItem,
} from "@/features/discovery/discovery-model";
import { buildFestivalDetailHref } from "@/features/festivals/festival-detail-model";

type FestivalSectionProps = {
  festivals: readonly FestivalItem[];
  query?: DiscoveryQuery;
};

function FestivalSection({
  festivals,
  query = { ...defaultDiscoveryQuery, tab: "festivals" },
}: FestivalSectionProps) {
  return (
    <section
      id="festivals"
      data-section="festivals"
      aria-labelledby="festival-section-title"
      className="px-4 pt-6"
    >
      <h2 id="festival-section-title" className="type-title-md text-foreground">
        이번 주 인기 축제
      </h2>

      {festivals.length > 0 ? (
        <ul aria-label="축제 일정" className="mt-4 grid gap-3">
          {festivals.map((festival) => (
            <li key={festival.id}>
              <FestivalListItem
                festival={festival}
                href={buildFestivalDetailHref(festival.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
          <p className="type-body-md text-muted-foreground">
            조건에 맞는 축제를 찾지 못했어요.
          </p>
          <Link
            href={buildDiscoveryHref(query, { q: "" }, "festivals")}
            className="type-label mt-3 inline-flex text-primary underline-offset-4 hover:underline"
          >
            검색어 지우기
          </Link>
        </div>
      )}
    </section>
  );
}

export { FestivalSection, type FestivalSectionProps };
