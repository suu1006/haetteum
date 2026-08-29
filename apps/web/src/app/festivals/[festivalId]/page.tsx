import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FestivalDetailContent } from "@/features/festivals/festival-detail-content";
import { festivalDetailQueryOptions } from "@/features/festivals/festival-detail-query";
import { mapFestivalDetail } from "@/features/festivals/festival-detail-model";
import { getServerQueryClient } from "@/features/query/query-client.server";

type FestivalDetailPageProps = {
  params: Promise<{ festivalId: string }>;
};

export async function generateMetadata({
  params,
}: FestivalDetailPageProps): Promise<Metadata> {
  const { festivalId } = await params;
  const result = await getServerQueryClient().fetchQuery(
    festivalDetailQueryOptions(festivalId),
  );

  if (result.status !== "ready") {
    return { title: "축제를 찾을 수 없어요 | 해뜸" };
  }

  const festival = mapFestivalDetail(result.data);
  return {
    title: `${festival.title} | 해뜸`,
    description:
      festival.overview ??
      `${festival.dateLabel} ${festival.location}에서 열리는 ${festival.title} 정보를 확인해 보세요.`,
  };
}

export default async function FestivalDetailPage({
  params,
}: FestivalDetailPageProps) {
  const { festivalId } = await params;
  const queryClient = getServerQueryClient();
  const result = await queryClient.fetchQuery(
    festivalDetailQueryOptions(festivalId),
  );

  if (result.status === "not-found") notFound();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FestivalDetailContent festivalId={festivalId} />
    </HydrationBoundary>
  );
}
