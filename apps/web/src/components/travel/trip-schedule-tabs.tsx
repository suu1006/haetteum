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
    <div
      role="tablist"
      aria-label="일정 구분"
      className="grid w-56 max-w-full grid-cols-2"
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${tab.id}-trip-panel`}
            id={`${tab.id}-trip-tab`}
            onClick={() => onChange(tab.id)}
            className="relative flex h-14 items-center justify-center px-2 text-[1rem] font-semibold text-muted-foreground outline-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-primary after:transition-transform hover:text-primary focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/25 aria-selected:text-primary aria-selected:after:scale-x-100"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export {
  TripScheduleTabs,
  type TripScheduleTab,
  type TripScheduleTabsProps,
};
