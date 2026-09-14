import { Button } from "@/components/ui/button/button";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type AuthPrimaryButtonProps = {
  loading?: boolean;
  loadingLabel?: string;
} & ComponentProps<"button">;

function AuthPrimaryButton({
  loading = false,
  loadingLabel,
  children,
  className,
  type = "button",
  disabled,
  ...props
}: AuthPrimaryButtonProps) {
  return (
    <Button
      type={type}
      disabled={Boolean(disabled || loading)}
      className={cn(
        "flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[0.95rem] font-bold text-primary-foreground shadow-card outline-none transition-[box-shadow,transform] focus-visible:ring-3 focus-visible:ring-ring/30 active:translate-y-px disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </Button>
  );
}

export { AuthPrimaryButton, type AuthPrimaryButtonProps };
