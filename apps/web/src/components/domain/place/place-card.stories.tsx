import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Image from "next/image";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";

import { PlaceCard } from "./place-card";

const meta = {
  title: "Domain/Place/PlaceCard",
  component: PlaceCard,
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
  args: {
    title: "협재해수욕장",
    location: "제주특별자치도 제주시 한림읍",
    rating: 4.8,
    reviewCount: 128,
    tags: ["바다", "산책", "가족 여행"],
    saved: false,
    onSavedChange: fn(),
    media: <Image src="/images/trips/jeju-healing.png" alt="제주 바다 여행 샘플" width={640} height={480} className="object-cover" />,
  },
  argTypes: { media: { control: false } },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <PlaceCard {...args} onSavedChange={(saved) => { args.onSavedChange?.(saved); updateArgs({ saved }); }} />;
  },
} satisfies Meta<typeof PlaceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Saved: Story = { args: { saved: true } };
export const WithoutImage: Story = { args: { media: null } };
export const WithoutReviews: Story = { args: { rating: 0, reviewCount: 0, tags: [] } };
export const LongContent: Story = { args: {
  title: "가족과 함께 여유롭게 걷기 좋은 제주 해안 산책길과 숨겨진 작은 해변",
  location: "제주특별자치도 제주시 한림읍 협재리 해안 산책로 입구",
  tags: ["아이와 함께", "반려동물 동반", "주차 가능", "일몰 명소", "산책"],
} };
