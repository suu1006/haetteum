import type { AuthUser } from "@/features/auth/auth-model";
import type {
  MyPageData,
  TravelRecordItem,
} from "@/features/profile/my-page-model";

const fallbackAvatar = "/images/profile/haetteumi-avatar.png";

type MyPageCounts = {
  reviewCount?: number;
};

export function createMyPageData(
  user: AuthUser,
  counts: MyPageCounts,
): MyPageData {
  const travelRecords: TravelRecordItem[] = [
    { id: "trips", label: "내 일정", countLabel: "0개", href: "/trips" },
  ];

  travelRecords.push({
    id: "reviews",
    label: "내 후기",
    ...(counts.reviewCount === undefined
      ? {}
      : { countLabel: `${counts.reviewCount}개` }),
    href: "/reviews",
  });

  travelRecords.push(
    { id: "favorites", label: "찜한 장소", countLabel: "0개" },
    { id: "visited", label: "방문한 장소", countLabel: "0개" },
  );

  return {
    profile: {
      nickname: user.displayName,
      authLabel: "카카오로 로그인됨",
      image: {
        src: isAllowedKakaoProfileImageUrl(user.profileImageUrl)
          ? user.profileImageUrl
          : fallbackAvatar,
        alt: `${user.displayName} 프로필`,
      },
    },
    travelRecords,
    aiRecommendation: {
      title: "AI 맞춤 여행 추천 받기",
      description: "나만을 위한 특별한 여행 코스를 추천해드려요",
      href: "/?region=gyeonggi&tab=recommended#ai-course",
      image: {
        src: "/images/discovery/reference-main/ai-course-robot.png",
        alt: "맞춤 여행을 추천하는 해뜸 도우미",
      },
    },
    menuItems: [
      { id: "notifications", label: "알림" },
      { id: "settings", label: "설정" },
      { id: "support", label: "고객센터" },
      { id: "guide", label: "이용 안내" },
      { id: "logout", label: "로그아웃" },
    ],
  };
}

export function isAllowedKakaoProfileImageUrl(
  value: string | null,
): value is string {
  if (value === null) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      (url.hostname === "k.kakaocdn.net" ||
        url.hostname.endsWith(".kakaocdn.net"))
    );
  } catch {
    return false;
  }
}

export type { MyPageCounts };
