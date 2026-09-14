import type { ReactNode } from "react";
export type ErrorStateProps = {
  label?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "section" | "inline";
  className?: string;
};
