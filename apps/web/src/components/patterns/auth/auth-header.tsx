import { ChevronLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

type AuthHeaderProps = {
  onBack: () => void;
  end?: ReactNode;
  title?: ReactNode;
};

function AuthHeader({ onBack, end, title }: AuthHeaderProps) {
  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between">
      <button
        type="button"
        aria-label="뒤로가기"
        onClick={onBack}
        className="-ml-2 inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-6" />
      </button>
      {title ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-12">{title}</div> : null}
      {end}
    </header>
  );
}

export { AuthHeader, type AuthHeaderProps };
