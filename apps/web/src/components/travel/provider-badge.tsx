import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ProviderBadgeProps = {
  provider: string;
  icon?: ReactNode;
  className?: string;
};

function ProviderBadge({ provider, icon, className }: ProviderBadgeProps) {
  return (
    <span
      className={cn(
        "type-caption inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 text-secondary-foreground",
        className,
      )}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {provider}
    </span>
  );
}

export { ProviderBadge, type ProviderBadgeProps };
