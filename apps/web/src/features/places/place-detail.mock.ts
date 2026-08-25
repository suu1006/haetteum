import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import type {
  PlaceCourseDetail,
  PlaceInformationDetail,
  PlaceIntroductionDetail,
  PlaceReviewDetail,
} from "@/features/places/place-detail-model";

export const placeCourseDetails = [
  {
    placeId: "icheon-termeden",
    course: {
      optimizationLabel: "AI 최적화",
      daySlotCount: 3,
      days: [
        {
          id: "day-1",
          label: "1일차",
          title: "이천 테르메덴 중심 1일 코스",
          totalDurationLabel: "총 소요시간 8시간 30분",
          totalDistanceLabel: "총 거리 18.7km",
          mapImage: {
            src: "/images/places/icheon-termeden/course/route-map.png",
            alt: "이천 테르메덴 1일 코스 경로 지도",
          },
          stops: [
            {
              id: "icheon-rice-breakfast",
              sequence: 1,
              periodLabel: "아침",
              timeLabel: "08:30",
              title: "임금님쌀밥집",
              categoryLabel: "건강한 한식",
              image: {
                src: "/images/themes/theme-food-cafe.png",
                alt: "정갈하게 차려진 이천 쌀밥 한상",
              },
              distanceLabel: "0.8km",
              travelTimeLabel: "3분",
            },
            {
              id: "icheon-termeden",
              sequence: 2,
              timeLabel: "09:00",
              title: "이천 테르메덴",
              categoryLabel: "온천·워터파크",
              image: {
                src: "/images/discovery/reference-main/icheon-termeden.png",
                alt: "온천 수영장이 있는 이천 테르메덴",
              },
              distanceLabel: "0km",
              travelTimeLabel: "0분",
            },
            {
              id: "seolbong-park",
              sequence: 3,
              timeLabel: "12:30",
              title: "설봉공원",
              categoryLabel: "산책·휴식",
              image: {
                src: "/images/welcome-lake-desktop.png",
                alt: "호수와 산책로가 어우러진 설봉공원",
              },
              distanceLabel: "5.2km",
              travelTimeLabel: "12분",
            },
            {
              id: "icheon-city-museum",
              sequence: 4,
              timeLabel: "14:00",
              title: "이천시립박물관",
              categoryLabel: "관람",
              image: {
                src: "/images/themes/theme-culture-hanok.png",
                alt: "전통 건축과 문화 전시 공간",
              },
              distanceLabel: "3.1km",
              travelTimeLabel: "8분",
            },
            {
              id: "haeju-cold-noodles",
              sequence: 5,
              periodLabel: "저녁",
              timeLabel: "19:00",
              title: "해주냉면",
              categoryLabel: "지역 맛집",
              image: {
                src: "/images/festivals/icheon-rice-cultural-festival/food-experience.png",
                alt: "이천의 지역 식재료로 차린 저녁 식사",
              },
              distanceLabel: "2.3km",
              travelTimeLabel: "7분",
            },
          ],
        },
      ],
    },
  },
] as const satisfies readonly PlaceCourseDetail[];

export const placeIntroductionDetails = [
  {
    placeId: "icheon-termeden",
    introduction: {
      addressLabel: "경기 이천시",
      description:
        "자연 속에서 온천과 물놀이를 함께 즐기는 휴식형 테마파크예요. 온천, 찜질, 스파와 워터파크를 한 장소에서 경험할 수 있어요.",
      heroImages: [
        {
          src: "/images/places/icheon-termeden/reviews/outdoor-pool.png",
          alt: "푸른 물빛의 이천 테르메덴 야외 온천 수영장",
        },
        {
          src: "/images/places/icheon-termeden/reviews/garden-spa.png",
          alt: "정원과 파빌리온이 보이는 이천 테르메덴 스파 풀",
        },
        {
          src: "/images/places/icheon-termeden/reviews/indoor-bath.png",
          alt: "큰 창으로 햇빛이 드는 이천 테르메덴 실내 온천",
        },
        {
          src: "/images/places/icheon-termeden/reviews/family-pool.png",
          alt: "가족이 함께 즐기는 이천 테르메덴 물놀이 풀",
        },
      ],
      facilities: [
        { id: "spa", icon: "spa", label: "온천·스파" },
        { id: "water-park", icon: "water-park", label: "워터파크" },
        { id: "sauna", icon: "sauna", label: "찜질방" },
        { id: "restaurant", icon: "restaurant", label: "레스토랑" },
      ],
      recommendationPoints: [
        "온천을 테마로 한 여러 종류의 휴식 시설",
        "계절에 따라 즐길 수 있는 실내외 스파",
        "아이와 함께 이용하기 좋은 물놀이 공간",
        "온천 뒤 여유롭게 쉬어 가는 휴식 공간",
      ],
      facilityPreviews: [
        {
          label: "야외 온천 스파",
          image: {
            src: "/images/places/icheon-termeden/reviews/outdoor-pool.png",
            alt: "푸른 물빛의 야외 온천 스파",
          },
        },
        {
          label: "실내 온천",
          image: {
            src: "/images/places/icheon-termeden/reviews/indoor-bath.png",
            alt: "햇빛이 드는 실내 온천",
          },
        },
        {
          label: "워터파크 존",
          image: {
            src: "/images/places/icheon-termeden/reviews/family-pool.png",
            alt: "가족이 이용하는 워터파크 존",
          },
        },
        {
          label: "정원 스파",
          image: {
            src: "/images/places/icheon-termeden/reviews/garden-spa.png",
            alt: "정원과 이어진 야외 스파",
          },
        },
      ],
      operatingHours: [
        { id: "spa", icon: "spa", label: "온천·스파", value: "09:00–22:00" },
        { id: "water-park", icon: "water-park", label: "워터파크", value: "10:00–18:00" },
        { id: "sauna", icon: "sauna", label: "찜질방", value: "24시간 운영" },
        { id: "restaurant", icon: "restaurant", label: "레스토랑", value: "09:00–21:00" },
      ],
      prices: [
        { label: "대인", value: "38,000원부터" },
        { label: "소인", value: "32,000원부터" },
        { label: "찜질복 대여", value: "2,000원" },
        { label: "수건 대여", value: "1,000원" },
      ],
      priceNotice: "시즌과 운영 정책에 따라 요금이 달라질 수 있어요.",
    },
  },
  {
    placeId: "everland",
    introduction: {
      addressLabel: "경기 용인시",
      description:
        "놀이기구와 계절별 정원을 하루 동안 폭넓게 즐길 수 있는 테마파크예요.",
      heroImages: [
        {
          src: "/images/discovery/reference-main/everland-theme-park.png",
          alt: "놀이기구와 정원이 어우러진 용인 에버랜드",
        },
      ],
      facilities: [
        { id: "rides", icon: "attraction", label: "놀이기구" },
        { id: "garden", icon: "nature", label: "계절 정원" },
        { id: "show", icon: "attraction", label: "공연" },
        { id: "restaurant", icon: "restaurant", label: "레스토랑" },
      ],
      recommendationPoints: [
        "연령과 취향에 따라 놀이기구와 공연을 골라 즐길 수 있어요.",
        "계절마다 달라지는 정원과 포토 스폿을 함께 둘러보기 좋아요.",
      ],
    },
  },
  {
    placeId: "suwon-hwaseong",
    introduction: {
      addressLabel: "경기 수원시",
      description:
        "성곽길을 따라 도시 풍경과 역사 이야기를 함께 만나는 산책 여행지예요.",
      heroImages: [
        {
          src: "/images/discovery/reference-main/suwon-hwaseong.png",
          alt: "노을빛 성곽길이 이어지는 수원 화성",
        },
      ],
      facilities: [
        { id: "wall", icon: "attraction", label: "성곽길" },
        { id: "palace", icon: "attraction", label: "행궁" },
        { id: "exhibit", icon: "attraction", label: "전시" },
        { id: "market", icon: "restaurant", label: "전통시장" },
      ],
      recommendationPoints: [
        "완만한 성곽길을 걸으며 여러 방향의 수원 풍경을 볼 수 있어요.",
        "주변 행궁과 시장을 한 여행 동선으로 연결하기 좋아요.",
      ],
    },
  },
  {
    placeId: "seongsan-ilchulbong",
    introduction: {
      addressLabel: "제주 서귀포시",
      description:
        "바다와 분화구 풍경을 함께 감상할 수 있는 제주 동부의 대표 자연 명소예요.",
      heroImages: [
        {
          src: "/images/discovery/place-seongsan.png",
          alt: "푸른 바다 너머로 보이는 성산일출봉",
        },
      ],
      facilities: [
        { id: "peak", icon: "nature", label: "전망대" },
        { id: "trail", icon: "nature", label: "탐방로" },
        { id: "coast", icon: "nature", label: "해안 산책" },
        { id: "rest", icon: "restaurant", label: "휴게 공간" },
      ],
      recommendationPoints: [
        "정상에 오르면 제주 동부 해안과 분화구 풍경이 한눈에 들어와요.",
        "주변 해안 산책과 함께 반나절 코스로 구성하기 좋아요.",
      ],
    },
  },
  {
    placeId: "hyeopjae-beach",
    introduction: {
      addressLabel: "제주 제주시",
      description:
        "맑고 잔잔한 물빛과 넓은 모래사장을 여유롭게 즐기는 제주 서부 해변이에요.",
      heroImages: [
        {
          src: "/images/discovery/place-hyeopjae.png",
          alt: "맑고 잔잔한 물빛의 제주 협재해수욕장",
        },
      ],
      facilities: [
        { id: "beach", icon: "water-park", label: "해변" },
        { id: "swim", icon: "water-park", label: "물놀이" },
        { id: "walk", icon: "nature", label: "해안 산책" },
        { id: "cafe", icon: "restaurant", label: "카페" },
      ],
      recommendationPoints: [
        "수심이 비교적 완만한 구간에서 천천히 바다를 즐길 수 있어요.",
        "제주 서부의 카페와 해안 드라이브 코스로 연결하기 좋아요.",
      ],
    },
  },
  {
    placeId: "bijarim-forest",
    introduction: {
      addressLabel: "제주 제주시",
      description:
        "오래된 비자나무 사이의 평탄한 숲길을 조용히 걷는 제주 자연 여행지예요.",
      heroImages: [
        {
          src: "/images/discovery/place-bijarim.png",
          alt: "초록 나무 사이로 길게 이어지는 제주 비자림 산책로",
        },
      ],
      facilities: [
        { id: "forest", icon: "nature", label: "비자나무 숲" },
        { id: "trail", icon: "nature", label: "탐방로" },
        { id: "rest", icon: "spa", label: "휴게 공간" },
        { id: "guide", icon: "attraction", label: "안내소" },
      ],
      recommendationPoints: [
        "나무 그늘이 이어지는 숲길에서 계절마다 다른 공기를 느낄 수 있어요.",
        "복잡한 코스 없이 차분한 산책을 원하는 일정에 잘 어울려요.",
      ],
    },
  },
] as const satisfies readonly PlaceIntroductionDetail[];

export const placeInformationDetails = [
  {
    placeId: "icheon-termeden",
    information: {
      addressLabel: "경기 이천시",
      contactLabel: "031-645-2000",
      homepageUrl: "https://termeden.com",
      facilitySummary: "온천·스파, 워터파크, 찜질방, 레스토랑",
      parkingLabel: "주차 정보 확인 필요",
      transportation: [
        { id: "car", icon: "car", label: "자가용", description: "서이천IC에서 차량으로 약 10분" },
        { id: "bus", icon: "bus", label: "버스", description: "이천터미널에서 지역 버스 이용" },
        { id: "train", icon: "train", label: "기차", description: "이천역에서 차량으로 약 15분" },
      ],
      usageGuides: [
        "입장 마감 시간은 시설별 운영 종료 전에 확인해 주세요.",
        "외부 음식 반입 여부는 방문 전 안내를 확인해 주세요.",
        "영유아 무료 입장에는 증빙서류가 필요할 수 있어요.",
        "반려동물 동반 가능 여부는 시설 정책을 확인해 주세요.",
      ],
      nearbyAttractions: [
        {
          id: "garden-course",
          title: "정원 산책 코스",
          travelTimeLabel: "차로 약 15분",
          categoryLabel: "자연·공원",
          image: {
            src: "/images/places/icheon-termeden/nearby/garden-pavilion.png",
            alt: "나무와 정자가 어우러진 정원 산책 코스",
          },
        },
        {
          id: "ceramics-space",
          title: "도자 문화 공간",
          travelTimeLabel: "차로 약 20분",
          categoryLabel: "체험·문화",
          image: {
            src: "/images/places/icheon-termeden/nearby/ceramics-village.png",
            alt: "도자 항아리와 한옥 전시관이 있는 문화 공간",
          },
        },
        {
          id: "history-space",
          title: "지역 생활문화관",
          travelTimeLabel: "차로 약 18분",
          categoryLabel: "전시·체험",
          image: {
            src: "/images/places/icheon-termeden/nearby/history-museum.png",
            alt: "정원 안에 자리한 지역 생활문화관",
          },
        },
      ],
      nearbyRestaurants: [
        {
          id: "rice-table",
          title: "이천 쌀밥 한상",
          travelTimeLabel: "차로 약 12분",
          categoryLabel: "한식",
          image: {
            src: "/images/places/icheon-termeden/restaurants/ssambap.png",
            alt: "쌈 채소와 생선구이로 차린 이천 쌀밥 한상",
          },
        },
        {
          id: "namul-table",
          title: "산나물 정식",
          travelTimeLabel: "차로 약 10분",
          categoryLabel: "한정식",
          image: {
            src: "/images/places/icheon-termeden/restaurants/namul-table.png",
            alt: "여러 산나물 반찬과 두부가 놓인 정식",
          },
        },
        {
          id: "garden-cafe",
          title: "숲길 정원 카페",
          travelTimeLabel: "차로 약 8분",
          categoryLabel: "카페·디저트",
          image: {
            src: "/images/places/icheon-termeden/restaurants/garden-cafe.png",
            alt: "나무와 정원이 보이는 조용한 카페",
          },
        },
      ],
    },
  },
  ...[
    ["everland", "경기 용인시", "자가용과 대중교통 이용 정보를 방문 전에 확인해 주세요."],
    ["suwon-hwaseong", "경기 수원시", "수원역과 도심 버스를 이용해 이동할 수 있어요."],
    ["seongsan-ilchulbong", "제주 서귀포시", "제주 동부 버스 또는 렌터카로 이동할 수 있어요."],
    ["hyeopjae-beach", "제주 제주시", "제주 서부 버스 또는 렌터카로 이동할 수 있어요."],
    ["bijarim-forest", "제주 제주시", "제주 동부 버스 또는 렌터카로 이동할 수 있어요."],
  ].map(([placeId, addressLabel, description]) => ({
    placeId,
    information: {
      addressLabel,
      transportation: [
        { id: "car", icon: "car" as const, label: "이동 안내", description },
      ],
      usageGuides: ["운영시간과 현장 이용 안내를 방문 전에 확인해 주세요."],
    },
  })),
] satisfies readonly PlaceInformationDetail[];

export const placeReviewDetails = [
  {
    placeId: "icheon-termeden",
    ratingDistribution: [
      { score: 5, count: 1677 },
      { score: 4, count: 466 },
      { score: 3, count: 156 },
      { score: 2, count: 32 },
      { score: 1, count: 14 },
    ],
    reviews: [
      {
        id: "icheon-kakao-clean-pool",
        provider: "kakao",
        author: "김여행",
        rating: 5,
        date: "2026.08.12",
        likeCount: 12,
        content:
          "시설이 깨끗하고 물도 좋아요! 가족끼리 오기 정말 좋은 곳입니다.",
        images: [
          {
            src: "/images/places/icheon-termeden/reviews/outdoor-pool.png",
            alt: "푸른 물빛의 이천 테르메덴 야외 온천 수영장",
          },
          {
            src: "/images/places/icheon-termeden/reviews/family-pool.png",
            alt: "가족이 함께 즐기는 이천 테르메덴 물놀이 풀",
          },
          {
            src: "/images/places/icheon-termeden/reviews/garden-spa.png",
            alt: "정원과 파빌리온이 보이는 이천 테르메덴 스파 풀",
          },
        ],
      },
      {
        id: "icheon-google-weekend",
        provider: "google",
        author: "Traveler_J",
        rating: 4,
        date: "2026.08.10",
        likeCount: 8,
        content:
          "다양한 탕이 있어서 좋았어요. 다만 주말에는 사람이 많아서 조금 붐빕니다.",
        images: [],
      },
      {
        id: "icheon-naver-family",
        provider: "naver",
        author: "민서네 가족여행",
        rating: 4.8,
        date: "2026.08.08",
        likeCount: 9,
        content:
          "아이와 함께 방문했는데 정말 즐거운 시간이었어요. 특히 야외존이 최고예요!",
        images: [
          {
            src: "/images/places/icheon-termeden/reviews/indoor-bath.png",
            alt: "큰 창으로 햇빛이 드는 이천 테르메덴 실내 온천",
          },
          {
            src: "/images/places/icheon-termeden/reviews/stone-pool.png",
            alt: "숲 가까이에 조성된 이천 테르메덴 돌 온천 풀",
          },
          {
            src: "/images/places/icheon-termeden/reviews/pavilion-pool.png",
            alt: "파빌리온을 마주 보는 이천 테르메덴 야외 수영장",
          },
        ],
      },
    ],
  },
  {
    placeId: "everland",
    ratingDistribution: [
      { score: 5, count: 2590 },
      { score: 4, count: 836 },
      { score: 3, count: 331 },
      { score: 2, count: 90 },
      { score: 1, count: 45 },
    ],
    reviews: [
      {
        id: "everland-google-garden",
        provider: "google",
        author: "놀이공원탐험가",
        rating: 4.5,
        date: "2026.08.16",
        likeCount: 21,
        content:
          "놀이기구뿐 아니라 정원도 잘 꾸며져 있어서 하루 종일 즐기기 좋았어요.",
        images: [
          {
            src: "/images/discovery/reference-main/everland-theme-park.png",
            alt: "놀이기구와 정원이 어우러진 용인 에버랜드",
          },
        ],
      },
    ],
  },
  {
    placeId: "suwon-hwaseong",
    ratingDistribution: [
      { score: 5, count: 1280 },
      { score: 4, count: 430 },
      { score: 3, count: 190 },
      { score: 2, count: 57 },
      { score: 1, count: 30 },
    ],
    reviews: [
      {
        id: "suwon-naver-wall-walk",
        provider: "naver",
        author: "수원산책",
        rating: 4.6,
        date: "2026.08.14",
        likeCount: 15,
        content:
          "성곽길을 따라 걷는 풍경이 좋고 해질 무렵 분위기가 특히 아름다웠어요.",
        images: [
          {
            src: "/images/discovery/reference-main/suwon-hwaseong.png",
            alt: "노을빛 성곽길이 이어지는 수원 화성",
          },
        ],
      },
    ],
  },
  {
    placeId: "seongsan-ilchulbong",
    ratingDistribution: [
      { score: 5, count: 900 },
      { score: 4, count: 260 },
      { score: 3, count: 80 },
      { score: 2, count: 30 },
      { score: 1, count: 14 },
    ],
    reviews: [
      {
        id: "seongsan-kakao-sunrise",
        provider: "kakao",
        author: "제주아침",
        rating: 5,
        date: "2026.08.11",
        likeCount: 28,
        content:
          "조금 일찍 올라가니 정상에서 시원한 바람과 멋진 풍경을 함께 볼 수 있었어요.",
        images: [
          {
            src: "/images/discovery/place-seongsan.png",
            alt: "푸른 바다 너머로 보이는 성산일출봉",
          },
        ],
      },
    ],
  },
  {
    placeId: "hyeopjae-beach",
    ratingDistribution: [
      { score: 5, count: 690 },
      { score: 4, count: 210 },
      { score: 3, count: 55 },
      { score: 2, count: 20 },
      { score: 1, count: 11 },
    ],
    reviews: [
      {
        id: "hyeopjae-google-water",
        provider: "google",
        author: "BlueTraveler",
        rating: 4.7,
        date: "2026.08.09",
        likeCount: 17,
        content:
          "물빛이 맑고 얕은 구간이 있어 천천히 바다를 즐기기 좋았습니다.",
        images: [
          {
            src: "/images/discovery/place-hyeopjae.png",
            alt: "맑고 잔잔한 물빛의 제주 협재해수욕장",
          },
        ],
      },
    ],
  },
  {
    placeId: "bijarim-forest",
    ratingDistribution: [
      { score: 5, count: 510 },
      { score: 4, count: 160 },
      { score: 3, count: 45 },
      { score: 2, count: 18 },
      { score: 1, count: 9 },
    ],
    reviews: [
      {
        id: "bijarim-naver-quiet",
        provider: "naver",
        author: "숲길기록",
        rating: 4.8,
        date: "2026.08.07",
        likeCount: 13,
        content:
          "나무 사이로 난 길이 평탄하고 조용해서 여유롭게 걷기 좋은 숲이에요.",
        images: [
          {
            src: "/images/discovery/place-bijarim.png",
            alt: "초록 나무 사이로 길게 이어지는 제주 비자림 산책로",
          },
        ],
      },
    ],
  },
] as const satisfies readonly PlaceReviewDetail[];

export function getPlaceDetailById(placeId: string) {
  const summary = mainDiscoveryMock.places.find((place) => place.id === placeId);
  const extension = placeReviewDetails.find(
    (detail) => detail.placeId === placeId,
  );
  const introduction = placeIntroductionDetails.find(
    (detail) => detail.placeId === placeId,
  );
  const course = placeCourseDetails.find(
    (detail) => detail.placeId === placeId,
  );
  const information = placeInformationDetails.find(
    (detail) => detail.placeId === placeId,
  );

  return summary && extension && introduction && information
    ? {
        ...summary,
        ...extension,
        ...introduction,
        ...information,
        ...(course ?? {}),
      }
    : undefined;
}

export function getPlaceStaticParams() {
  return mainDiscoveryMock.places.map(({ id }) => ({ placeId: id }));
}
