import type { ErrorStateProps } from "./error-state.types";
import { EmptyState } from "../empty-state/empty-state";
import { cn } from "@/lib/utils";
export function ErrorState({
  label,
  title = `${label ?? "정보"}를 불러오지 못했어요`,
  description = "잠시 후 다시 시도해 주세요.",
  action,
  variant = "section",
  className,
}: ErrorStateProps) {
  if (variant === "inline")
    return (
      <EmptyState
        title={title}
        description={description}
        action={action}
        className={className}
      />
    );
  return (
    <section className={cn("px-4 py-16 text-center", className)}>
      <h2 className="type-title-md text-foreground">{title}</h2>
      <p className="type-body-md mt-2 text-muted-foreground">{description}</p>
      {action}
    </section>
  );
}
