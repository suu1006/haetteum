import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TabsProps } from "./tabs.types";
export function Tabs({ label, items, currentId, replace }: TabsProps) {
  return <nav aria-label={label} className="border-b border-border bg-card">
    <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(item => <li key={item.id}>
        <Link href={item.href} replace={replace} aria-current={item.id === currentId ? "page" : undefined}
          className={cn("type-label relative flex min-h-14 items-center justify-center px-1 text-center text-muted-foreground outline-none transition-colors focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/25", item.id === currentId && "font-semibold text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary")}>{item.label}</Link>
      </li>)}
    </ul>
  </nav>;
}
