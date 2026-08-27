import type {
  NearbyPlaceCategory,
  NearbyPlacesResponse,
  PlaceDetailResponse,
} from "@haetteum/contracts";
import Image from "next/image";

import { PlaceDetailHeader } from "@/components/travel/place-detail-header";
import { PlaceDetailPreparation } from "@/components/travel/place-detail-preparation";
import { PlaceDetailTabs } from "@/components/travel/place-detail-tabs";
import { PlaceImageGallery } from "@/components/travel/place-image-gallery";
import type { PlaceDetailQuery } from "@/features/places/place-detail-model";

type LiveNearby = Partial<Record<NearbyPlaceCategory, NearbyPlacesResponse>>;

function LiveIntroduction({ place }: { place: PlaceDetailResponse }) {
  const guides = [
    ["운영 시간", place.introduction.useTime],
    ["휴무일", place.introduction.restDate],
    ["이용 계절", place.introduction.useSeason],
    ["주차", place.introduction.parking],
    ["안내센터", place.introduction.infoCenter],
    ["체험 연령", place.introduction.experienceAgeRange],
    ["체험 안내", place.introduction.experienceGuide],
    ["유모차", place.introduction.babyCarriage],
    ["신용카드", place.introduction.creditCard],
    ["반려동물", place.introduction.pet],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  return (
    <section aria-label={`${place.title} 소개`}>
      <PlaceImageGallery
        title={place.title}
        images={place.images.map((image) => ({ src: image.url, alt: image.alt }))}
      />
      <div className="space-y-4 bg-card px-5 py-5">
        <h2 className="type-title-lg text-foreground">{place.title}</h2>
        {place.address ? <p className="type-body-md text-muted-foreground">{place.address}</p> : null}
        {place.overview ? <p className="type-body-md leading-6 text-foreground">{place.overview}</p> : null}
        {place.images.some((image) => image.copyrightType) ? (
          <p className="type-caption text-muted-foreground">
            이미지 저작권 {place.images.find((image) => image.copyrightType)?.copyrightType}
          </p>
        ) : null}
      </div>
      {guides.length > 0 ? (
        <dl className="mx-3 my-4 divide-y divide-border rounded-2xl border border-border bg-card px-4">
          {guides.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[5rem_1fr] gap-3 py-3">
              <dt className="type-label text-muted-foreground">{label}</dt>
              <dd className="type-body-md text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function NearbySection({ response }: { response: NearbyPlacesResponse }) {
  if (response.status === "unavailable") {
    return <p className="type-body-md mt-3 text-muted-foreground">주변 장소 정보를 불러오지 못했어요.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-border">
      {response.items.map((item) => (
        <li key={item.providerPlaceId} className="flex items-center gap-3 py-3">
          <div className="relative size-14 overflow-hidden rounded-lg bg-muted">
            <Image src="/images/explore/categories/popular-attraction.png" alt="" fill sizes="56px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <a href={item.placeUrl} target="_blank" rel="noreferrer" className="type-label text-foreground">
              {item.title}
            </a>
            <p className="type-caption truncate text-muted-foreground">{item.categoryLabel}</p>
          </div>
          <span className="type-caption text-muted-foreground">
            {item.distanceMeters == null ? "거리 미제공" : `직선거리 ${item.distanceMeters.toLocaleString("ko-KR")}m`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function LiveInformation({ place, nearby }: { place: PlaceDetailResponse; nearby: LiveNearby }) {
  return (
    <section aria-label={`${place.title} 정보`} className="space-y-3 px-3 py-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="type-title-md text-foreground">기본 정보</h2>
        <dl className="mt-3 space-y-2 type-body-md">
          {place.address ? <div><dt className="text-muted-foreground">주소</dt><dd>{place.address}</dd></div> : null}
          {place.telephone ? <div><dt className="text-muted-foreground">연락처</dt><dd>{place.telephone}</dd></div> : null}
          {place.homepage ? <div><dt className="text-muted-foreground">홈페이지</dt><dd><a href={place.homepage}>바로가기</a></dd></div> : null}
        </dl>
      </div>
      {place.information.map((item) => (
        <section key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <h2 className="type-title-md">{item.name}</h2><p className="type-body-md mt-2">{item.text}</p>
        </section>
      ))}
      {(["attraction", "restaurant", "cafe"] as const).map((category) => (
        <section key={category} className="rounded-2xl border border-border bg-card p-4">
          <h2 className="type-title-md">{category === "attraction" ? "주변 관광지" : category === "restaurant" ? "주변 맛집" : "주변 카페"}</h2>
          <NearbySection response={nearby[category] ?? { status: "unavailable", reason: "provider_unavailable" }} />
        </section>
      ))}
    </section>
  );
}

export function LivePlaceDetailScreen({
  place,
  query,
  nearby = {},
}: {
  place: PlaceDetailResponse;
  query: PlaceDetailQuery;
  nearby?: LiveNearby;
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[calc(7rem+var(--safe-area-bottom))]">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <PlaceDetailHeader title={place.title} />
        <PlaceDetailTabs placeId={place.id} currentTab={query.tab} />
      </div>
      {query.tab === "introduction" ? <LiveIntroduction place={place} /> : null}
      {query.tab === "information" ? <LiveInformation place={place} nearby={nearby} /> : null}
      {query.tab === "reviews" ? (
        <section className="px-4 py-16 text-center">
          <h2 className="type-title-md text-foreground">아직 등록된 후기가 없어요</h2>
          <p className="type-body-md mt-2 text-muted-foreground">해뜸의 첫 후기를 기다리고 있어요.</p>
        </section>
      ) : null}
      {query.tab === "course" ? <PlaceDetailPreparation placeId={place.id} tab="course" /> : null}
    </div>
  );
}
