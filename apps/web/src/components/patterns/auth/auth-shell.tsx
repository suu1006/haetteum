import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthShellProps = {
  surfaceTestId: string;
  cardTestId: string;
  ariaLabelledBy: string;
  className?: string;
  children: ReactNode;
};

function AuthShell({
  surfaceTestId,
  cardTestId,
  ariaLabelledBy,
  className,
  children,
}: AuthShellProps) {
  return (
    <main
      data-testid={surfaceTestId}
      className="min-h-svh bg-background md:grid md:place-items-center md:bg-muted/50 md:p-8"
    >
      <section
        data-testid={cardTestId}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "safe-area-top safe-area-bottom flex min-h-svh w-full flex-col bg-card px-5 pb-6 md:min-h-[33.125rem] md:max-w-[26.875rem] md:rounded-[1.75rem] md:border md:border-border/80 md:px-8 md:pb-8 md:shadow-overlay",
          className,
        )}
      >
        {children}
      </section>
    </main>
  );
}

export { AuthShell, type AuthShellProps };
