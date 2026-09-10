"use client";

import { useRef } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

type OtpCodeInputProps = {
  length: number;
  value: string[];
  onChange: (next: string[]) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
};

function OtpCodeInput({
  length,
  value,
  onChange,
  onComplete,
  disabled = false,
  ariaLabel,
  className,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const candidate = next.join("");
    if (candidate.length === length) {
      onComplete(candidate);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!digits) return;

    event.preventDefault();
    const next = Array(length).fill("");
    for (let index = 0; index < digits.length; index += 1) {
      next[index] = digits[index];
    }
    onChange(next);
    inputRefs.current[Math.min(digits.length, length - 1)]?.focus();
    if (digits.length === length) {
      onComplete(digits);
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex justify-between gap-2", className)}
    >
      {value.map((digit, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`인증번호 ${index + 1}번째 자리`}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className="h-14 w-full rounded-2xl border border-border bg-card text-center text-lg font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-60"
        />
      ))}
    </div>
  );
}

export { OtpCodeInput, type OtpCodeInputProps };
