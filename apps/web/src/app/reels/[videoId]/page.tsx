import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReelsViewer } from "@/components/travel/reels-viewer";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import {
  findPopularVideoById,
  orderPopularVideosFrom,
} from "@/features/discovery/popular-video-feed";

type ReelsPageProps = {
  params: Promise<{ videoId: string }>;
};

export function generateStaticParams() {
  return mainDiscoveryMock.popularPlaces.videos.map(({ id }) => ({
    videoId: id,
  }));
}

export async function generateMetadata({
  params,
}: ReelsPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const video = findPopularVideoById(
    mainDiscoveryMock.popularPlaces.videos,
    videoId,
  );

  if (!video) return { title: "영상을 찾을 수 없어요 | 해뜸" };

  return {
    title: `${video.title} | 해뜸`,
    description: video.description,
  };
}

export default async function ReelsPage({ params }: ReelsPageProps) {
  const { videoId } = await params;
  const videos = orderPopularVideosFrom(
    mainDiscoveryMock.popularPlaces.videos,
    videoId,
  );

  if (!videos) notFound();

  return <ReelsViewer videos={videos} returnHref="/?tab=places" />;
}

export type { ReelsPageProps };
