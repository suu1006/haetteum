"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { FestivalDetailScreen } from "@/components/patterns/festival-detail-screen";
import { festivalDetailQueryOptions } from "@/features/festivals/festival-detail-query";
import { mapFestivalDetail } from "@/features/festivals/festival-detail-model";

type FestivalDetailContentProps = {
  festivalId: string;
};

export function FestivalDetailContent({
  festivalId,
}: FestivalDetailContentProps) {
  const { data } = useQuery(festivalDetailQueryOptions(festivalId));

  // 서버에서 미리 채운 캐시를 하이드레이션하므로 첫 렌더에도 데이터가 있다.
  if (data == null) return null;

  if (data.status !== "ready") {
    return (
      <main className="mx-auto flex min-h-screen max-w-[30rem] flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="type-body-md text-muted-foreground">
          축제 정보를 불러오지 못했어요.
        </p>
        <Link
          href="/?tab=festivals"
          className="type-label text-primary underline-offset-4 hover:underline"
        >
          축제 목록으로 돌아가기
        </Link>
      </main>
    );
  }

  return <FestivalDetailScreen festival={mapFestivalDetail(data.data)} />;
}
