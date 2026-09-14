import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { fn } from "storybook/test";

import { PlaceRankingCard } from "./place-ranking-card";

// A fictional URL on the production allowlist; MSW serves a local image.
// The request is never sent to the external provider.
const photoUrl = "https://tong.visitkorea.or.kr/storybook/haetteum-fixture.png";
const failedPhotoUrl = "https://tong.visitkorea.or.kr/storybook/haetteum-missing.png";
const place = {
  rank: 1,
  sourcePlaceId: "00000000000000000000000000000001",
  title: "협재해수욕장",
  category: "자연 관광지",
  sharePercent: 12.8,
  placeId: "00000000-0000-4000-8000-000000000001",
  primaryImageUrl: photoUrl,
  imageCopyrightType: null,
  imageAttribution: "Storybook 로컬 샘플",
  imageAttributionUrl: null,
};

const meta = {
  title: "Domain/Place/PlaceRankingCard",
  component: PlaceRankingCard,
  decorators: [(Story) => <div className="max-w-48"><Story /></div>],
  args: { place, onImageError: fn() },
  parameters: {
    msw: { handlers: [http.get(photoUrl, async () => {
      const response = await fetch("/images/trips/jeju-healing.png");
      return new HttpResponse(await response.arrayBuffer(), { headers: { "Content-Type": "image/png" } });
    }), http.get(failedPhotoUrl, () => new HttpResponse(null, { status: 404 }))] },
  },
} satisfies Meta<typeof PlaceRankingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutImage: Story = { args: { place: { ...place, primaryImageUrl: null, imageAttribution: null } } };
export const UnmatchedPlace: Story = { args: { place: { ...place, placeId: null } } };
export const LongTitle: Story = { args: { place: { ...place, title: "제주의 푸른 바다를 따라 걷는 가족 여행 해안 산책로" } } };
export const ImageFailure: Story = {
  args: { place: { ...place, primaryImageUrl: failedPhotoUrl } },
};
