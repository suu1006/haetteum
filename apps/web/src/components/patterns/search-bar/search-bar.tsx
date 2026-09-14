import { Input } from "@/components/ui/input/input";
import { Button } from "@/components/ui/button/button";
import { SearchIcon } from "lucide-react";
import type { SearchBarProps } from "./search-bar.types";
export function SearchBar({
  id,
  label,
  action,
  defaultValue,
  placeholder = "어디로 떠나볼까요?",
  children,
  onSubmit,
}: SearchBarProps) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      onSubmit={onSubmit}
      className="relative"
    >
      {children}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        name="q"
        key={defaultValue}
        defaultValue={defaultValue}
        type="search"
        placeholder={placeholder}
        className="type-body-md md:text-[0.875rem] h-12 w-full rounded-full border border-transparent bg-muted pr-12 pl-4 text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
      />
      <Button
        variant="ghost"
        type="submit"
        aria-label="검색"
        className="absolute inset-y-0 right-1 border-0 p-0 inline-flex size-10 items-center justify-center self-center rounded-full text-muted-foreground outline-none hover:bg-primary-subtle hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <SearchIcon className="size-5" aria-hidden="true" />
      </Button>
    </form>
  );
}
