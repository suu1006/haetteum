import { WeeklyPlaceListItem } from "@/components/travel/weekly-place-list-item";
import type { PlaceListItem } from "@haetteum/contracts";
import type { WeeklyPlacesLoadState } from "@/features/places/weekly-places";

type WeeklyPlacesSectionProps = {
  results: WeeklyPlacesLoadState | null;
};

function WeeklyPlacesSection({ results }: WeeklyPlacesSectionProps) {
  const places: PlaceListItem[] = results?.status === "ready" ? results.items : [];
  return (
    <section
      id="weekly-places"
      data-section="weekly-places"
      aria-labelledby="weekly-places-title"
      className="px-4 pt-6"
    >
      <h2 id="weekly-places-title" className="type-title-md text-foreground">
        이번 주 가볼만한 곳
      </h2>

      {places.length > 0 ? (
        <ul aria-label="이번 주 추천 장소" className="mt-4 grid gap-3">
          {places.map((place) => (
            <li key={place.id}>
              <WeeklyPlaceListItem place={place} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
          <p className="type-body-md text-muted-foreground">
            {results?.status === "ready" ? "이번 주 추천할 장소가 없어요." : "추천 장소를 불러오지 못했어요."}
          </p>
        </div>
      )}
    </section>
  );
}

export { WeeklyPlacesSection, type WeeklyPlacesSectionProps };
