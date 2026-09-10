import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

type AuthTextFieldProps = {
  id: string;
  label: string;
  icon: LucideIcon;
} & Omit<ComponentProps<"input">, "id" | "className">;

function AuthTextField({ id, label, icon: Icon, ...inputProps }: AuthTextFieldProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={id}
        className="h-14 w-full rounded-2xl border border-border bg-card pr-4 pl-11 type-body-md text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
        {...inputProps}
      />
    </div>
  );
}

export { AuthTextField, type AuthTextFieldProps };
