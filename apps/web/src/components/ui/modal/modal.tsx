"use client";
import { Dialog as Primitive } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function StyledBackdrop({
  className,
  unstyled = false,
  ...props
}: ComponentProps<typeof Primitive.Backdrop> & { unstyled?: boolean }) {
  const base = unstyled
    ? ""
    : "fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-180 data-ending-style:opacity-0 data-starting-style:opacity-0";
  return (
    <Primitive.Backdrop
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(base, className(state))
          : cn(base, className)
      }
    />
  );
}

function StyledViewport({
  className,
  unstyled = false,
  ...props
}: ComponentProps<typeof Primitive.Viewport> & { unstyled?: boolean }) {
  const base = unstyled ? "" : "fixed inset-0 z-50 flex justify-center";
  return (
    <Primitive.Viewport
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(base, className(state))
          : cn(base, className)
      }
    />
  );
}

function StyledPopup({
  className,
  unstyled = false,
  ...props
}: ComponentProps<typeof Primitive.Popup> & { unstyled?: boolean }) {
  const base = unstyled
    ? ""
    : "relative w-full border border-white/70 bg-card text-foreground shadow-floating outline-none transition-[transform,opacity] duration-180 data-ending-style:opacity-0 data-starting-style:opacity-0";
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

function StyledClose({
  className,
  unstyled = false,
  ...props
}: ComponentProps<typeof Primitive.Close> & { unstyled?: boolean }) {
  const base = unstyled
    ? ""
    : "outline-none focus-visible:ring-3 focus-visible:ring-ring/25";
  return (
    <Primitive.Close
      {...props}
      className={
        typeof className === "function"
          ? (state) => cn(base, className(state))
          : cn(base, className)
      }
    />
  );
}

export const Modal = {
  ...Primitive,
  Backdrop: StyledBackdrop,
  Viewport: StyledViewport,
  Popup: StyledPopup,
  Close: StyledClose,
};
