import { Tabs } from "@/components/ui/tabs/tabs";

import {
  buildPlaceDetailHref,
  type PlaceDetailTabId,
} from "@/features/places/place-detail-model";


type PlaceDetailTabsProps = {
  placeId: string;
  currentTab: PlaceDetailTabId;
};

const tabs = [
  { id: "introduction", label: "소개" },
  { id: "course", label: "코스 추천" },
  { id: "reviews", label: "후기" },
  { id: "information", label: "정보" },
] as const;

function PlaceDetailTabs({ placeId, currentTab }: PlaceDetailTabsProps) {
  return <Tabs label="장소 상세 탭" currentId={currentTab} replace items={tabs.map(tab => ({ ...tab, href: buildPlaceDetailHref(placeId, { tab: tab.id, source: "all" }) }))} />;
}
export { PlaceDetailTabs, type PlaceDetailTabsProps };
