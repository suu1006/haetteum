import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { YouTubeReelsViewer } from "@/components/travel/youtube-reels-viewer";
import { loadPlaceReels } from "@/features/discovery/place-reels-api";

type PlaceReelsPageProps = {
  params: Promise<{ placeId: string }>;
};

export const metadata: Metadata = {
  title: "인기 관광지 릴스 | 해뜸",
  description: "인기 관광지의 짧은 영상을 이어서 만나보세요.",
};

export default async function PlaceReelsPage({ params }: PlaceReelsPageProps) {
  const { placeId } = await params;
  const result = await loadPlaceReels(placeId);

  if (result.status === "not-found" || result.status === "empty") notFound();
  if (result.status === "error") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[30rem] items-center justify-center bg-background px-5 text-center">
        <div>
          <h1 className="type-title-md">릴스를 불러오지 못했어요</h1>
          <p className="type-body-md mt-2 text-muted-foreground">
            잠시 후 다시 시도해 주세요.
          </p>
        </div>
      </main>
    );
  }

  const items = result.data.items.map((item) => ({
    videoId: item.videoId,
    title: item.title,
    channelTitle: item.channelTitle,
    embedUrl: item.embedUrl,
    placeId: result.data.placeId,
  }));

  return <YouTubeReelsViewer items={items} returnHref="/?tab=places" />;
}

export type { PlaceReelsPageProps };
