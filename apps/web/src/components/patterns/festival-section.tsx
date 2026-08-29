import { FestivalListItem } from "@/components/travel/festival-list-item";
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
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
          <p className="type-body-md text-muted-foreground">
            이번 달에 열리는 축제 정보가 없어요.
          </p>
        </div>
      )}
    </section>
  );
}

export { FestivalSection, type FestivalSectionProps };
