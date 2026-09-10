import { ChevronLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

type AuthHeaderProps = {
  onBack: () => void;
  end?: ReactNode;
};

function AuthHeader({ onBack, end }: AuthHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between">
      <button
        type="button"
        aria-label="뒤로가기"
        onClick={onBack}
        className="-ml-2 inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-6" />
      </button>
      {end}
    </header>
  );
}

export { AuthHeader, type AuthHeaderProps };
