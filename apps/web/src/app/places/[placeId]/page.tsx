import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlaceDetailScreen } from "@/components/patterns/place-detail-screen";
import { LivePlaceDetailScreen } from "@/components/patterns/live-place-detail-screen";
import { loadPlaceDetail, loadPlaceReviews } from "@/features/places/place-detail-api";
import {
  getPlaceDetailById,
  getPlaceStaticParams,
} from "@/features/places/place-detail.mock";
import {
  parsePlaceDetailQuery,
  type PlaceDetailSearchParams,
} from "@/features/places/place-detail-model";
import { placeCoursesQueryOptions } from "@/features/places/place-course-query";
import { generatedCourseQueryOptions } from "@/features/places/place-generated-course-query";
import { placeNearbyQueryOptions } from "@/features/places/place-nearby-query";
import { getServerQueryClient } from "@/features/query/query-client.server";

type PlaceDetailPageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<PlaceDetailSearchParams>;
};

const reviewCountFormatter = new Intl.NumberFormat("ko-KR");
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateStaticParams() {
  return getPlaceStaticParams();
}

export async function generateMetadata({
  params,
}: Pick<PlaceDetailPageProps, "params">): Promise<Metadata> {
  const { placeId } = await params;
  if (uuidPattern.test(placeId)) {
    const result = await loadPlaceDetail(placeId);
    if (result.status !== "ready") {
      return { title: "장소를 찾을 수 없어요 | 해뜸" };
    }
    return {
      title: `${result.data.title} 소개 | 해뜸`,
      description:
        result.data.overview ??
        result.data.address ??
        `${result.data.title}의 여행 정보를 확인해 보세요.`,
    };
  }
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
  const query = parsePlaceDetailQuery(rawSearchParams);
  const isUuid = uuidPattern.test(placeId);

  if (isUuid) {
    const result = await loadPlaceDetail(placeId);
    if (result.status === "not-found") notFound();
    if (result.status === "error") {
      return (
        <main className="min-h-screen bg-background px-5 py-16 text-center">
          <h1 className="type-title-md">장소 정보를 불러오지 못했어요</h1>
          <p className="type-body-md mt-2 text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        </main>
      );
    }
    const queryClient = getServerQueryClient();
    if (query.tab === "information") {
      await Promise.all(
        (["attraction", "restaurant", "cafe"] as const).map((category) =>
          queryClient.fetchQuery(placeNearbyQueryOptions(placeId, category)),
        ),
      );
    }
    if (query.tab === "course") {
      await Promise.all([
        queryClient.fetchQuery(placeCoursesQueryOptions(placeId)),
        queryClient.fetchQuery(generatedCourseQueryOptions(placeId)),
      ]);
    }
    const reviews =
      query.tab === "reviews" ? await loadPlaceReviews(placeId) : null;
    return (
      <main className="min-h-screen bg-background">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <LivePlaceDetailScreen
            place={result.data}
            query={query}
            reviews={reviews?.status === "ready" ? reviews.data : null}
          />
        </HydrationBoundary>
      </main>
    );
  }

  const place = getPlaceDetailById(placeId);

  if (!place) notFound();

  return (
    <main className="min-h-screen bg-background">
      <PlaceDetailScreen
        place={place}
        query={query}
      />
    </main>
  );
}

export type { PlaceDetailPageProps };
