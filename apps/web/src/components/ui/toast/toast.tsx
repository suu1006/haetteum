import type { ToastProps } from "./toast.types";
/** A caller-controlled status message; positioning and lifetime belong to the feature. */
export function Toast(props: ToastProps) {
  return <p role="status" aria-live="polite" {...props} />;
}
