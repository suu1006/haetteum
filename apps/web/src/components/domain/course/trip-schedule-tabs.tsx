import { SelectionTabs } from "@/components/ui/tabs/selection-tabs";
type TripScheduleTab = "scheduled" | "past";

type TripScheduleTabsProps = {
  activeTab: TripScheduleTab;
  onChange: (tab: TripScheduleTab) => void;
};

const tabs: ReadonlyArray<{ id: TripScheduleTab; label: string }> = [
  { id: "scheduled", label: "예정된 일정" },
  { id: "past", label: "지난 일정" },
];

function TripScheduleTabs({ activeTab, onChange }: TripScheduleTabsProps) {
  return (
    <SelectionTabs
      label="일정 구분"
      value={activeTab}
      onChange={onChange}
      items={tabs.map((tab) => ({
        ...tab,
        tabId: `${tab.id}-trip-tab`,
        panelId: `${tab.id}-trip-panel`,
      }))}
      className="grid w-56 max-w-full grid-cols-2"
      tabClassName="relative flex h-14 items-center justify-center px-2 text-[1rem] font-semibold text-muted-foreground outline-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-primary after:transition-transform hover:text-primary focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/25 aria-selected:text-primary aria-selected:after:scale-x-100"
    />
  );
}

export { TripScheduleTabs, type TripScheduleTab, type TripScheduleTabsProps };
