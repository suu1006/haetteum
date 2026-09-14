import type { ComponentProps, ReactNode } from "react";
export type SearchBarProps = { id: string; label: string; action: string; defaultValue?: string; placeholder?: string; children?: ReactNode; onSubmit?: ComponentProps<"form">["onSubmit"] };
