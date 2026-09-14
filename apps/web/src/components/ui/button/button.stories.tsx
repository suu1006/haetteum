import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { PlusIcon } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "여행 시작하기", onClick: fn() },
  argTypes: {
    variant: { control: "select", options: ["default", "outline", "secondary", "ghost", "destructive", "link", "glass"] },
    size: { control: "select", options: ["default", "sm", "lg", "icon", "icon-sm"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outline: Story = { args: { variant: "outline" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Destructive: Story = { args: { variant: "destructive", children: "삭제하기" } };
export const Disabled: Story = { args: { disabled: true } };
export const Large: Story = { args: { size: "lg" } };
export const Icon: Story = { args: { size: "icon", "aria-label": "장소 추가", children: <PlusIcon aria-hidden="true" /> } };
export const Glass: Story = {
  args: { variant: "glass" },
  decorators: [(Story) => <div className="rounded-xl bg-primary p-6"><Story /></div>],
};
