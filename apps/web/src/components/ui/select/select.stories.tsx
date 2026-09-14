import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const regions = [
  { label: "전체 지역", value: "all" },
  { label: "서울", value: "seoul" },
  { label: "제주", value: "jeju" },
];

const meta = {
  title: "UI/Select",
  component: Select,
  args: { items: regions, onValueChange: fn() },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger aria-label="여행 지역"><SelectValue placeholder="지역 선택" /></SelectTrigger>
      <SelectContent>
        {regions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  ),
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { defaultValue: "jeju" } };
export const Disabled: Story = { args: { disabled: true } };
