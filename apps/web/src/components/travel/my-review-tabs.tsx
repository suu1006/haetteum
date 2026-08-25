import type { KeyboardEvent } from "react";

import type { MyReviewsTabId } from "@/features/profile/my-reviews-model";

type MyReviewTabsProps = {
  activeTab: MyReviewsTabId;
  onChange: (tab: MyReviewsTabId) => void;
};

const tabs = [
  { id: "written", label: "작성한 후기" },
  { id: "bookmarked", label: "북마크" },
] as const;

function MyReviewTabs({ activeTab, onChange }: MyReviewTabsProps) {
  function moveSelection(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    event.currentTarget.parentElement
      ?.querySelector<HTMLElement>(`#my-reviews-${nextTab.id}-tab`)
      ?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="내 후기 분류"
      className="grid grid-cols-2 border-b border-border"
    >
      {tabs.map((tab, index) => {
        const selected = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`my-reviews-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="my-reviews-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => moveSelection(event, index)}
            className="relative min-h-12 px-3 pb-3 text-sm font-semibold text-muted-foreground outline-none transition-colors after:absolute after:inset-x-7 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-transparent aria-selected:text-primary aria-selected:after:bg-primary focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/25"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export { MyReviewTabs, type MyReviewTabsProps };
