export type MyPageProfile = {
  nickname: string;
  authLabel: string;
  image: {
    src: string;
    alt: string;
  };
};

export type TravelRecordItem = {
  id: "trips" | "reviews" | "favorites" | "visited";
  label: string;
  countLabel?: string;
  href?: string;
};

export type MyPageMenuItem = {
  id: "notifications" | "settings" | "support" | "guide" | "logout" | "withdraw" | "blocked-users";
  label: string;
  hasNotice?: boolean;
  href?: string;
};

export type MyPageData = {
  profile: MyPageProfile;
  travelRecords: readonly TravelRecordItem[];
  aiRecommendation: {
    title: string;
    description: string;
    image: {
      src: string;
      alt: string;
    };
  };
  menuItems: readonly MyPageMenuItem[];
};
