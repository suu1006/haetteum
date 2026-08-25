import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FestivalDetailScreen } from "@/components/patterns/festival-detail-screen";
import {
  getFestivalDetailById,
  getFestivalStaticParams,
} from "@/features/festivals/festival-detail.mock";

type FestivalDetailPageProps = {
  params: Promise<{ festivalId: string }>;
};

export function generateStaticParams() {
  return getFestivalStaticParams();
}

export async function generateMetadata({
  params,
}: FestivalDetailPageProps): Promise<Metadata> {
  const { festivalId } = await params;
  const festival = getFestivalDetailById(festivalId);

  if (!festival) notFound();

  return {
    title: `${festival.title} | 해뜸`,
    description: `${festival.dateLabel} ${festival.location}에서 열리는 ${festival.title} 정보를 확인해 보세요.`,
  };
}

export default async function FestivalDetailPage({
  params,
}: FestivalDetailPageProps) {
  const { festivalId } = await params;
  const festival = getFestivalDetailById(festivalId);

  if (!festival) notFound();

  return <FestivalDetailScreen festival={festival} />;
}
