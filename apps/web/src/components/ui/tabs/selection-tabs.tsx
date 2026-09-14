"use client";
import { useRef } from "react";
export type SelectionTabsProps<T extends string> = {
  label: string;
  items: readonly { id: T; label: string; tabId: string; panelId: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  tabClassName?: string;
};
export function SelectionTabs<T extends string>({
  label,
  items,
  value,
  onChange,
  className,
  tabClassName,
}: SelectionTabsProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={label} className={className}>
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(node) => {
            buttons.current[index] = node;
          }}
          type="button"
          role="tab"
          id={item.tabId}
          aria-controls={item.panelId}
          aria-selected={item.id === value}
          tabIndex={item.id === value ? 0 : -1}
          className={tabClassName}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => {
            let next: number;
            switch (event.key) {
              case "ArrowRight":
                next = (index + 1) % items.length;
                break;
              case "ArrowLeft":
                next = (index + items.length - 1) % items.length;
                break;
              case "Home":
                next = 0;
                break;
              case "End":
                next = items.length - 1;
                break;
              default:
                return;
            }
            event.preventDefault();
            onChange(items[next].id);
            buttons.current[next]?.focus();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
