import type { DiscoveryImage } from "@/features/discovery/discovery-model";

export type SavedCourseTransfer = {
  distanceLabel: string;
  durationLabel: string;
};

export type SavedCourseStop = {
  id: string;
  order: number;
  time: string;
  title: string;
  categoryLabel: string;
  durationLabel: string;
  image: DiscoveryImage;
  transfer?: SavedCourseTransfer;
};

export type SavedCourseFixture = {
  id: string;
  title: string;
  completionMessage: string;
  recommendationLabel: string;
  totalDurationLabel: string;
  totalDistanceLabel: string;
  estimatedCostLabel: string;
  mapImage: DiscoveryImage;
  stops: readonly SavedCourseStop[];
};
