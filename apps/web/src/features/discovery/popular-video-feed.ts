import type { PopularVideoItem } from "@/features/discovery/discovery-model";

function findPopularVideoById(
  videos: readonly PopularVideoItem[],
  videoId: string,
) {
  return videos.find((video) => video.id === videoId);
}

function orderPopularVideosFrom(
  videos: readonly PopularVideoItem[],
  videoId: string,
): readonly PopularVideoItem[] | null {
  const selectedIndex = videos.findIndex((video) => video.id === videoId);

  if (selectedIndex < 0) return null;

  return [...videos.slice(selectedIndex), ...videos.slice(0, selectedIndex)];
}

export { findPopularVideoById, orderPopularVideosFrom };
