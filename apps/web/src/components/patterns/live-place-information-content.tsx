"use client";

import { useQueries } from "@tanstack/react-query";
import Image from "next/image";

import type {
  NearbyPlaceCategory,
  NearbyPlacesResponse,
  PlaceDetailResponse,
} from "@haetteum/contracts";

import { placeNearbyQueryOptions } from "@/features/places/place-nearby-query";

const NEARBY_CATEGORIES = [
  "attraction",
  "restaurant",
  "cafe",
] as const satisfies readonly NearbyPlaceCategory[];

const NEARBY_CATEGORY_LABELS: Record<NearbyPlaceCategory, string> = {
  attraction: "주변 관광지",
  restaurant: "주변 맛집",
  cafe: "주변 카페",
};

function NearbySection({
  response,
}: {
  response: NearbyPlacesResponse | undefined;
}) {
  // 서버가 채운 캐시가 하이드레이션되기 전까지는 아직 데이터가 없다.
  if (response == null) return null;
  if (response.status === "unavailable") {
    return (
      <p className="type-body-md mt-3 text-muted-foreground">
        주변 장소 정보를 불러오지 못했어요.
      </p>
    );
  }
  return (
    <ul className="mt-3 divide-y divide-border">
      {response.items.map((item) => (
        <li
          key={item.providerPlaceId}
          className="flex items-center gap-3 py-3"
        >
          <div className="relative size-14 overflow-hidden rounded-lg bg-muted">
            <Image
              src="/images/explore/categories/popular-attraction.png"
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={item.placeUrl}
              target="_blank"
              rel="noreferrer"
              className="type-label text-foreground"
            >
              {item.title}
            </a>
            <p className="type-caption truncate text-muted-foreground">
              {item.categoryLabel}
            </p>
          </div>
          <span className="type-caption text-muted-foreground">
            {item.distanceMeters == null
              ? "거리 미제공"
              : `직선거리 ${item.distanceMeters.toLocaleString("ko-KR")}m`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function LiveInformationContent({ place }: { place: PlaceDetailResponse }) {
  const results = useQueries({
    queries: NEARBY_CATEGORIES.map((category) =>
      placeNearbyQueryOptions(place.id, category),
    ),
  });

  return (
    <section aria-label={`${place.title} 정보`} className="space-y-3 px-3 py-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="type-title-md text-foreground">기본 정보</h2>
        <dl className="mt-3 space-y-2 type-body-md">
          {place.address ? (
            <div>
              <dt className="text-muted-foreground">주소</dt>
              <dd>{place.address}</dd>
            </div>
          ) : null}
          {place.telephone ? (
            <div>
              <dt className="text-muted-foreground">연락처</dt>
              <dd>{place.telephone}</dd>
            </div>
          ) : null}
          {place.homepage ? (
            <div>
              <dt className="text-muted-foreground">홈페이지</dt>
              <dd>
                <a href={place.homepage}>바로가기</a>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
      {place.information.map((item) => (
        <section
          key={item.id}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <h2 className="type-title-md">{item.name}</h2>
          <p className="type-body-md mt-2">{item.text}</p>
        </section>
      ))}
      {NEARBY_CATEGORIES.map((category, index) => (
        <section
          key={category}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <h2 className="type-title-md">{NEARBY_CATEGORY_LABELS[category]}</h2>
          <NearbySection response={results[index]?.data} />
        </section>
      ))}
    </section>
  );
}

export { LiveInformationContent };
