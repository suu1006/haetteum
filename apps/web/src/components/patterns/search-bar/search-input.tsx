import { SearchIcon } from "lucide-react";
import type { InputProps } from "@/components/ui/input/input.types";
import { Input } from "@/components/ui/input/input";
import { cn } from "@/lib/utils";
export function SearchInput({ className, ...props }: InputProps) {
  return (
    <div className="relative">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        {...props}
        className={cn("border-transparent bg-secondary pl-10", className)}
      />
    </div>
  );
}
