import type { ExploreData } from "@/features/explore/explore-model";

const exploreMock = {
  categories: [
    {
      id: "popular",
      label: "인기 관광지",
      href: "/?region=jeju&tab=places",
      tone: "purple",
      image: {
        src: "/images/explore/categories/popular-attraction.png",
        alt: "인기 관광지를 상징하는 전망대",
      },
    },
    {
      id: "festival",
      label: "관광 축제",
      href: "/?region=jeju&tab=festivals",
      tone: "purple",
      image: {
        src: "/images/explore/categories/festival.png",
        alt: "관광 축제를 상징하는 불꽃놀이",
      },
    },
    {
      id: "theme",
      label: "테마 여행",
      href: "/?region=gyeonggi&tab=ai-course",
      tone: "amber",
      image: {
        src: "/images/explore/categories/theme-travel.png",
        alt: "테마 여행을 상징하는 노을 풍경",
      },
    },
    {
      id: "course",
      label: "여행 코스",
      href: "/?region=gyeonggi&tab=ai-course",
      tone: "green",
      image: {
        src: "/images/explore/categories/travel-course.png",
        alt: "여행 코스를 상징하는 지도 관문",
      },
    },
    {
      id: "stay",
      label: "숙소 추천",
      href: "/?q=%EC%88%99%EC%86%8C&region=gyeonggi&tab=recommended",
      tone: "blue",
      image: {
        src: "/images/explore/categories/stay.png",
        alt: "추천 숙소를 상징하는 건물",
      },
    },
  ],
  trending: [
    {
      id: "jeju",
      rank: 1,
      title: "제주도",
      href: "/?region=jeju&tab=recommended",
      image: {
        src: "/images/discovery/main-hero-jeju.png",
        alt: "푸른 바다와 오름이 펼쳐진 제주도",
      },
    },
    {
      id: "gangneung",
      rank: 2,
      title: "강릉",
      href: "/?region=gangwon&tab=recommended",
      image: {
        src: "/images/welcome-lake-desktop.png",
        alt: "잔잔한 물가와 산책로가 있는 강릉",
      },
    },
    {
      id: "yeosu",
      rank: 3,
      title: "여수",
      href: "/?q=%EC%97%AC%EC%88%98&region=busan&tab=recommended",
      image: {
        src: "/images/trips/busan-sea.png",
        alt: "맑은 바다와 섬이 보이는 여수",
      },
    },
  ],
  regions: [
    { id: "seoul", label: "서울" },
    { id: "gyeonggi", label: "경기" },
    { id: "gangwon", label: "강원" },
    { id: "busan", label: "부산" },
    { id: "jeju", label: "제주" },
  ],
  regionalDestinations: {
    seoul: [
      {
        id: "bukchon",
        title: "북촌 한옥마을",
        location: "서울 종로",
        href: "/?q=%EB%B6%81%EC%B4%8C&region=seoul&tab=recommended",
        image: {
          src: "/images/themes/theme-culture-hanok.png",
          alt: "서울 북촌의 한옥 골목",
        },
      },
      {
        id: "seoul-forest",
        title: "서울숲",
        location: "서울 성동",
        href: "/?q=%EC%84%9C%EC%9A%B8%EC%88%B2&region=seoul&tab=recommended",
        image: {
          src: "/images/discovery/place-bijarim.png",
          alt: "나무가 울창한 서울숲 산책로",
        },
      },
      {
        id: "namsan",
        title: "남산서울타워",
        location: "서울 용산",
        href: "/?q=%EB%82%A8%EC%82%B0&region=seoul&tab=recommended",
        image: {
          src: "/images/discovery/reference-main/suwon-hwaseong.png",
          alt: "도심 풍경이 내려다보이는 남산",
        },
      },
    ],
    gyeonggi: [
      {
        id: "heyri-art-village",
        title: "파주 헤이리마을",
        location: "경기 파주",
        href: "/?q=%ED%97%A4%EC%9D%B4%EB%A6%AC&region=gyeonggi&tab=recommended",
        image: {
          src: "/images/themes/theme-culture-hanok.png",
          alt: "고즈넉한 건축과 나무가 어우러진 파주 헤이리마을",
        },
      },
      {
        id: "morning-calm-garden",
        title: "가평 아침고요수목원",
        location: "경기 가평",
        href: "/?q=%EC%95%84%EC%B9%A8%EA%B3%A0%EC%9A%94%EC%88%98%EB%AA%A9%EC%9B%90&region=gyeonggi&tab=recommended",
        image: {
          src: "/images/places/icheon-termeden/nearby/garden-pavilion.png",
          alt: "계절 꽃과 정원이 펼쳐진 가평 아침고요수목원",
        },
      },
      {
        id: "korean-folk-village",
        title: "용인 한국민속촌",
        location: "경기 용인",
        href: "/?q=%ED%95%9C%EA%B5%AD%EB%AF%BC%EC%86%8D%EC%B4%8C&region=gyeonggi&tab=recommended",
        image: {
          src: "/images/places/icheon-termeden/nearby/ceramics-village.png",
          alt: "전통 한옥이 모여 있는 용인 한국민속촌",
        },
      },
    ],
    gangwon: [
      {
        id: "gyeongpo",
        title: "강릉 경포대",
        location: "강원 강릉",
        href: "/?q=%EA%B2%BD%ED%8F%AC%EB%8C%80&region=gangwon&tab=recommended",
        image: {
          src: "/images/welcome-lake-desktop.png",
          alt: "호수와 소나무가 어우러진 강릉 경포대",
        },
      },
      {
        id: "sokcho",
        title: "속초 해변",
        location: "강원 속초",
        href: "/?q=%EC%86%8D%EC%B4%88&region=gangwon&tab=recommended",
        image: {
          src: "/images/themes/theme-healing-beach.png",
          alt: "맑은 바다가 펼쳐진 속초 해변",
        },
      },
      {
        id: "daegwallyeong",
        title: "대관령 양떼목장",
        location: "강원 평창",
        href: "/?q=%EB%8C%80%EA%B4%80%EB%A0%B9&region=gangwon&tab=recommended",
        image: {
          src: "/images/welcome-balloon-valley-desktop.png",
          alt: "초록 언덕이 펼쳐진 대관령",
        },
      },
    ],
    busan: [
      {
        id: "haeundae",
        title: "해운대 해수욕장",
        location: "부산 해운대",
        href: "/?q=%ED%95%B4%EC%9A%B4%EB%8C%80&region=busan&tab=recommended",
        image: {
          src: "/images/trips/busan-sea.png",
          alt: "부산 해운대의 푸른 바다",
        },
      },
      {
        id: "gamcheon",
        title: "감천문화마을",
        location: "부산 사하",
        href: "/?q=%EA%B0%90%EC%B2%9C&region=busan&tab=recommended",
        image: {
          src: "/images/themes/course-gyeongju-history.png",
          alt: "알록달록한 집이 이어지는 감천문화마을",
        },
      },
      {
        id: "taejongdae",
        title: "태종대",
        location: "부산 영도",
        href: "/?q=%ED%83%9C%EC%A2%85%EB%8C%80&region=busan&tab=recommended",
        image: {
          src: "/images/discovery/place-seongsan.png",
          alt: "절벽과 바다가 만나는 부산 태종대",
        },
      },
    ],
    jeju: [
      {
        id: "seongsan",
        title: "성산일출봉",
        location: "제주 서귀포",
        href: "/places/seongsan-ilchulbong?tab=course",
        image: {
          src: "/images/discovery/place-seongsan.png",
          alt: "바다 위로 솟은 성산일출봉",
        },
      },
      {
        id: "hyeopjae",
        title: "협재해수욕장",
        location: "제주 제주시",
        href: "/places/hyeopjae-beach?tab=course",
        image: {
          src: "/images/discovery/place-hyeopjae.png",
          alt: "투명한 물빛의 협재해수욕장",
        },
      },
      {
        id: "bijarim",
        title: "비자림",
        location: "제주 제주시",
        href: "/places/bijarim-forest?tab=course",
        image: {
          src: "/images/discovery/place-bijarim.png",
          alt: "고목과 숲길이 이어지는 비자림",
        },
      },
    ],
  },
} satisfies ExploreData;

export { exploreMock };
