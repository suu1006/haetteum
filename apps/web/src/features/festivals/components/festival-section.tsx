import { EmptyState } from "@/components/patterns/empty-state/empty-state";
import { FestivalListItem } from "@/components/domain/festival/festival-list-item";
import type { FestivalDiscoveryListItem } from "@/features/discovery/discovery-model";
import { buildFestivalDetailHref } from "@/features/festivals/festival-detail-model";

type FestivalSectionProps = {
  festivals: readonly FestivalDiscoveryListItem[];
};

function FestivalSection({ festivals }: FestivalSectionProps) {
  return (
    <section
      id="festivals"
      data-section="festivals"
      aria-labelledby="festival-section-title"
      className="px-4 pt-6"
    >
      <h2 id="festival-section-title" className="type-title-md text-foreground">
        이번 달 인기 축제
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
        <EmptyState title={<> 이번 달에 열리는 축제 정보가 없어요. </>} />
      )}
    </section>
  );
}

export { FestivalSection, type FestivalSectionProps };
