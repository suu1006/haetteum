import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlaceDetailScreen } from "@/components/patterns/place-detail-screen";
import {
  getPlaceDetailById,
  getPlaceStaticParams,
} from "@/features/places/place-detail.mock";
import {
  parsePlaceDetailQuery,
  type PlaceDetailSearchParams,
} from "@/features/places/place-detail-model";

type PlaceDetailPageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<PlaceDetailSearchParams>;
};

const reviewCountFormatter = new Intl.NumberFormat("ko-KR");

export function generateStaticParams() {
  return getPlaceStaticParams();
}

export async function generateMetadata({
  params,
}: Pick<PlaceDetailPageProps, "params">): Promise<Metadata> {
  const { placeId } = await params;
  const place = getPlaceDetailById(placeId);

  if (!place) {
    return { title: "장소를 찾을 수 없어요 | 해뜸" };
  }

  return {
    title: `${place.title} 후기 | 해뜸`,
    description: `${place.title}의 통합 후기 ${reviewCountFormatter.format(place.reviewCount)}개를 확인해 보세요.`,
  };
}

export default async function PlaceDetailPage({
  params,
  searchParams,
}: PlaceDetailPageProps) {
  const [{ placeId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const place = getPlaceDetailById(placeId);

  if (!place) notFound();

  return (
    <main className="min-h-screen bg-background">
      <PlaceDetailScreen
        place={place}
        query={parsePlaceDetailQuery(rawSearchParams)}
      />
    </main>
  );
}

export type { PlaceDetailPageProps };
