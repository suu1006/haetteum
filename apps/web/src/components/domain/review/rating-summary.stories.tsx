import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RatingSummary } from "./rating-summary";

const meta = {
  title: "Domain/Review/RatingSummary",
  component: RatingSummary,
  decorators: [(Story) => <div className="max-w-lg"><Story /></div>],
  args: {
    value: 4.5,
    reviewCount: 100,
    distribution: [
      { score: 5, count: 60 }, { score: 4, count: 30 },
      { score: 3, count: 10 }, { score: 2, count: 0 }, { score: 1, count: 0 },
    ],
  },
} satisfies Meta<typeof RatingSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Compact: Story = { args: { size: "compact", distribution: undefined } };
export const Split: Story = { args: { layout: "split", tone: "primary", distributionValue: "count" } };
export const WithoutReviews: Story = { args: { value: 0, reviewCount: 0, distribution: [] } };
export const LargeReviewCount: Story = { args: { reviewCount: 123456, distribution: undefined } };
