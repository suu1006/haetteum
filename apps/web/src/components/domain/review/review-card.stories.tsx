import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ReviewCard } from "./review-card";

const meta = {
  title: "Domain/Review/ReviewCard",
  component: ReviewCard,
  decorators: [(Story) => <div className="max-w-lg"><Story /></div>],
  args: {
    author: "여행하는 해뜸",
    rating: 4.5,
    date: "2026.09.14",
    content: "바다가 맑고 산책하기 좋아요. 다음에는 가족들과 다시 방문하고 싶어요.",
    provider: "해뜸",
  },
} satisfies Meta<typeof ReviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Feed: Story = { args: { variant: "feed", likeCount: 12 } };
export const WithPhotos: Story = { args: {
  variant: "feed",
  images: [
    { src: "/images/trips/jeju-healing.png", alt: "제주 여행 샘플" },
    { src: "/images/trips/busan-sea.png", alt: "바다 여행 샘플" },
  ],
} };
export const LongContent: Story = { args: {
  author: "주말마다 새로운 곳을 찾아 떠나는 여행자",
  content: "산책로가 잘 정비되어 있어 천천히 걸으며 풍경을 즐겼어요. ".repeat(12),
} };
