import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  args: { "aria-label": "장소 검색", placeholder: "가고 싶은 장소를 검색해 보세요" },
  
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: "제주 협재해수욕장" } };
export const Disabled: Story = { args: { disabled: true } };
export const Email: Story = { args: { type: "email", "aria-label": "이메일", placeholder: "hello@example.com" } };
export const WithError: Story = {
  args: { "aria-invalid": true, "aria-describedby": "search-error" },
  render: (args) => <div className="space-y-2"><Input {...args} /><p id="search-error" className="type-caption text-destructive">검색어를 입력해 주세요.</p></div>,
};
