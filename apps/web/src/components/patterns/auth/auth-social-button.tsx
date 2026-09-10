import { MessageCircleIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const socialButtonClassName =
  "flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-5 type-body-md font-semibold text-foreground outline-none transition-[box-shadow,transform] focus-visible:ring-3 focus-visible:ring-ring/30 active:translate-y-px";

function KakaoGlyph() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 items-center justify-center rounded-full bg-[#fee500] text-[#191919]"
    >
      <MessageCircleIcon aria-hidden="true" className="size-3.5 fill-current" />
    </span>
  );
}

type AuthSocialLinkButtonProps = {
  icon: ReactNode;
  children: ReactNode;
} & ComponentProps<"a">;

function AuthSocialLinkButton({
  icon,
  children,
  className,
  ...anchorProps
}: AuthSocialLinkButtonProps) {
  return (
    <a className={cn(socialButtonClassName, className)} {...anchorProps}>
      {icon}
      {children}
    </a>
  );
}

type AuthSocialActionButtonProps = {
  icon: ReactNode;
  children: ReactNode;
} & ComponentProps<"button">;

function AuthSocialActionButton({
  icon,
  children,
  className,
  type = "button",
  ...buttonProps
}: AuthSocialActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(socialButtonClassName, className)}
      {...buttonProps}
    >
      {icon}
      {children}
    </button>
  );
}

export {
  KakaoGlyph,
  AuthSocialLinkButton,
  type AuthSocialLinkButtonProps,
  AuthSocialActionButton,
  type AuthSocialActionButtonProps,
};
