import { SelectionTabs } from "@/components/ui/tabs/selection-tabs";

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
  return (
    <SelectionTabs
      label="내 후기 분류"
      value={activeTab}
      onChange={onChange}
      items={tabs.map((tab) => ({
        ...tab,
        tabId: `my-reviews-${tab.id}-tab`,
        panelId: "my-reviews-panel",
      }))}
      className="grid grid-cols-2 border-b border-border"
      tabClassName="relative min-h-12 px-3 pb-3 text-sm font-semibold text-muted-foreground outline-none transition-colors after:absolute after:inset-x-7 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-transparent aria-selected:text-primary aria-selected:after:bg-primary focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/25"
    />
  );
}

export { MyReviewTabs, type MyReviewTabsProps };
