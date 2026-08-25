import type {
  DiscoveryImage,
  FestivalItem,
} from "@/features/discovery/discovery-model";

export const festivalProgramIconIds = [
  "rice-bowl",
  "pavilion",
  "performance",
  "camera",
] as const;
export const festivalPointIconIds = [
  "leaf",
  "family",
  "food",
  "parking",
] as const;

export type FestivalProgramIconId = (typeof festivalProgramIconIds)[number];
export type FestivalPointIconId = (typeof festivalPointIconIds)[number];

export type FestivalProgram = {
  id: string;
  title: string;
  description: string;
  icon: FestivalProgramIconId;
};

export type FestivalRecommendationPoint = {
  id: string;
  title: string;
  description: string;
  icon: FestivalPointIconId;
};

export type NearbyCourse = {
  id: string;
  title: string;
  category: string;
  distanceLabel: string;
  image: DiscoveryImage;
};

export type FestivalDetail = FestivalItem & {
  rating: number;
  reviewCount: number;
  gallery: readonly DiscoveryImage[];
  introduction: string;
  programs: readonly FestivalProgram[];
  recommendationPoints: readonly FestivalRecommendationPoint[];
  nearbyCourses: readonly NearbyCourse[];
};

export function buildFestivalDetailHref(id: string) {
  return `/festivals/${encodeURIComponent(id)}`;
}
