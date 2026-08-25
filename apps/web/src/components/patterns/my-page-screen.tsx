import type { CSSProperties } from "react";
import { TbBell } from "react-icons/tb";

import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import { MyPageAiBanner } from "@/components/travel/my-page-ai-banner";
import { MyPageMenuList } from "@/components/travel/my-page-menu-list";
import { ProfileSummaryCard } from "@/components/travel/profile-summary-card";
import { TravelRecordSummary } from "@/components/travel/travel-record-summary";
import type { MyPageData } from "@/features/profile/my-page-model";

type MyPageScreenProps = {
  data: MyPageData;
};

const myPageNavigationItems = createMainNavigationItems("profile");

const myPageStyle = {
  "--my-page-navigation-height": "3.5rem",
  "--my-page-navigation-reserve":
    "calc(var(--my-page-navigation-height) + var(--safe-area-bottom) + 2rem)",
} as CSSProperties;

function MyPageScreen({ data }: MyPageScreenProps) {
  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[var(--my-page-navigation-reserve)]"
      style={myPageStyle}
    >
      <header className="flex items-center justify-between px-6 pt-[38px] pb-4">
        <h1 className="text-[1.55rem] font-bold leading-9 tracking-[-0.03em] text-foreground">
          마이페이지
        </h1>
        <button
          type="button"
          aria-label="알림"
          disabled
          className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <TbBell aria-hidden="true" className="size-5" strokeWidth={1.7} />
        </button>
      </header>

      <main className="space-y-4 px-6 pb-6">
        <ProfileSummaryCard profile={data.profile} />
        <TravelRecordSummary items={data.travelRecords} />
        <MyPageAiBanner recommendation={data.aiRecommendation} />
        <MyPageMenuList items={data.menuItems} />
      </main>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto min-h-[var(--my-page-navigation-height)] w-full max-w-[30rem] bg-card">
        <BottomNavigation items={myPageNavigationItems} variant="profile" />
      </div>
    </div>
  );
}

export { MyPageScreen, type MyPageScreenProps };
