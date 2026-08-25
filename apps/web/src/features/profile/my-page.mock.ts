import type { MyPageData } from "@/features/profile/my-page-model";

export const myPageMock = {
  profile: {
    nickname: "해뜸이",
    levelLabel: "여행자 Lv.3",
    nextLevelLabel: "다음 레벨까지 230P 남았어요!",
    pointsLabel: "2,770P",
    progressPercent: 38,
    image: {
      src: "/images/profile/haetteumi-avatar.png",
      alt: "해뜸이 프로필",
    },
  },
  travelRecords: [
    { id: "trips", label: "내 일정", countLabel: "3개" },
    { id: "reviews", label: "내 후기", countLabel: "12개", href: "/reviews" },
    { id: "favorites", label: "찜한 장소", countLabel: "28개" },
    { id: "visited", label: "방문한 장소", countLabel: "15개" },
  ],
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
    { id: "notifications", label: "알림", hasNotice: true },
    { id: "settings", label: "설정" },
    { id: "support", label: "고객센터" },
    { id: "guide", label: "이용 안내" },
    { id: "logout", label: "로그아웃" },
  ],
} satisfies MyPageData;
