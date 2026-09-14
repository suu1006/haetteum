import { cn } from "@/lib/utils";
import type { EmptyStateProps } from "./empty-state.types";
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return <div className={cn("mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4", className)}>
    <p className="type-body-md text-muted-foreground">{title}</p>
    {description && <p className="type-caption mt-1 text-muted-foreground">{description}</p>}
    {action}
  </div>;
}
