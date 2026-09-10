import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SelectableChipProps = {
  selected: boolean;
  onToggle: () => void;
  variant?: "block" | "pill";
  children: ReactNode;
};

function SelectableChip({
  selected,
  onToggle,
  variant = "block",
  children,
}: SelectableChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "border font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/25",
        variant === "pill"
          ? "min-h-9 rounded-full px-3 type-caption"
          : "min-h-10 rounded-xl px-4 type-caption",
        selected
          ? "border-primary bg-primary-subtle text-primary"
          : "border-border text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export { SelectableChip, type SelectableChipProps };
