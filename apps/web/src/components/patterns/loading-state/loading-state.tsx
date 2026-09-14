import type { LoadingStateProps } from "./loading-state.types";
/** Custom layouts replace the caption preset; status semantics remain shared. */
export function LoadingState({ className = "type-caption text-muted-foreground", ...props }: LoadingStateProps) {
  return <p role="status" aria-live="polite" className={className} {...props} />;
}
