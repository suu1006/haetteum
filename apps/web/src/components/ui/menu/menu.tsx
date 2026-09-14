"use client";
import { Menu as Primitive } from "@base-ui/react/menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function StyledPopup({
  className,
  unstyled = false,
  ...props
}: ComponentProps<typeof Primitive.Popup> & { unstyled?: boolean }) {
  const base = unstyled
    ? ""
    : "origin-(--transform-origin) rounded-2xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";
  return (
    <Primitive.Popup
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(base, className(state))
          : cn(base, className)
      }
    />
  );
}

function StyledTrigger({
  className,
  unstyled = false,
  ...props
}: ComponentProps<typeof Primitive.Trigger> & { unstyled?: boolean }) {
  const base = unstyled
    ? ""
    : "flex shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25";
  return (
    <Primitive.Trigger
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(base, className(state))
          : cn(base, className)
      }
    />
  );
}

function StyledItem({
  className,
  ...props
}: ComponentProps<typeof Primitive.Item>) {
  const base =
    "flex min-h-9 cursor-default items-center rounded-xl px-3 text-sm outline-hidden select-none focus:bg-accent";
  return (
    <Primitive.Item
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(base, className(state))
          : cn(base, className)
      }
    />
  );
}
export const Menu = {
  ...Primitive,
  Popup: StyledPopup,
  Trigger: StyledTrigger,
  Item: StyledItem,
};
