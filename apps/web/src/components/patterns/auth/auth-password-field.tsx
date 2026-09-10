import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import type { ComponentProps } from "react";

type AuthPasswordFieldProps = {
  id: string;
  label: string;
  show: boolean;
  onToggleShow: () => void;
  showAriaPressed?: boolean;
} & Omit<ComponentProps<"input">, "id" | "className" | "type">;

function AuthPasswordField({
  id,
  label,
  show,
  onToggleShow,
  showAriaPressed = false,
  ...inputProps
}: AuthPasswordFieldProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <LockIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={id}
        type={show ? "text" : "password"}
        className="h-14 w-full rounded-2xl border border-border bg-card pr-11 pl-11 type-body-md text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
        {...inputProps}
      />
      <button
        type="button"
        aria-label={show ? "비밀번호 숨기기" : "비밀번호 표시"}
        aria-pressed={showAriaPressed ? show : undefined}
        onClick={onToggleShow}
        className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        {show ? (
          <EyeOffIcon aria-hidden="true" className="size-5" />
        ) : (
          <EyeIcon aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
}

export { AuthPasswordField, type AuthPasswordFieldProps };
