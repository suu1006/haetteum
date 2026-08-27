import type { MyReviewsData } from "@/features/profile/my-reviews-model";

export const myReviewsMock = {
  bookmarked: [
    {
      id: "bookmarked-seongsan",
      placeId: "seongsan-ilchulbong",
      title: "성산일출봉",
      location: "제주",
      rating: 4.8,
      date: "2026.08.18",
      content: "정상에서 바라본 바다와 일출이 오래 기억에 남아요.",
      likeCount: 41,
      commentCount: 7,
      bookmarked: true,
      image: {
        src: "/images/discovery/place-seongsan.png",
        alt: "푸른 바다 너머로 보이는 성산일출봉",
      },
    },
    {
      id: "bookmarked-hyeopjae",
      placeId: "hyeopjae-beach",
      title: "협재해수욕장",
      location: "제주",
      rating: 4.7,
      date: "2026.08.09",
      content: "물이 맑고 잔잔해서 천천히 바다를 즐기기 좋았어요.",
      likeCount: 24,
      commentCount: 4,
      bookmarked: true,
      image: {
        src: "/images/discovery/place-hyeopjae.png",
        alt: "맑고 잔잔한 물빛의 제주 협재해수욕장",
      },
    },
  ],
} satisfies Pick<MyReviewsData, "bookmarked">;
