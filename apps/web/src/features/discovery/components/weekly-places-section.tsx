import { EmptyState } from "@/components/patterns/empty-state/empty-state";
import { WeeklyPlaceListItem } from "@/components/domain/place/weekly-place-list-item";
import type { WeeklyPlaceItem } from "@haetteum/contracts";
import type { WeeklyPlacesLoadState } from "@/features/places/weekly-places";

type WeeklyPlacesSectionProps = {
  results: WeeklyPlacesLoadState | null;
};

function WeeklyPlacesSection({ results }: WeeklyPlacesSectionProps) {
  const places: WeeklyPlaceItem[] =
    results?.status === "ready" ? results.items : [];
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
        <ul
          aria-label="이번 주 추천 장소"
          className="mt-4 grid grid-cols-2 gap-3"
        >
          {places.map((place) => (
            <li key={place.id} className="min-w-0">
              <WeeklyPlaceListItem place={place} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={
            <>
              {results?.status === "ready"
                ? "이번 주 추천할 장소가 없어요."
                : "추천 장소를 불러오지 못했어요."}
            </>
          }
        />
      )}
      {places.length > 0 && (
        <p className="type-caption mt-3 text-muted-foreground">
          사진 출처: 한국관광공사 · 공공누리 제1유형 (썸네일 가공)
        </p>
      )}
    </section>
  );
}

export { WeeklyPlacesSection, type WeeklyPlacesSectionProps };
