import type { FestivalDetail } from "@/features/festivals/festival-detail-model";

const jejuCourses = [
  { id: "seongsan-ilchulbong", title: "성산일출봉", category: "자연 명소", distanceLabel: "차로 25분", image: { src: "/images/discovery/place-seongsan.png", alt: "바다에서 바라본 성산일출봉" } },
  { id: "hyeopjae-beach", title: "협재해수욕장", category: "해변", distanceLabel: "차로 35분", image: { src: "/images/discovery/place-hyeopjae.png", alt: "맑은 물빛의 협재해수욕장" } },
  { id: "bijarim-forest", title: "비자림", category: "숲길", distanceLabel: "차로 30분", image: { src: "/images/discovery/place-bijarim.png", alt: "초록빛이 이어지는 비자림 산책로" } },
] as const;

const icheonCourses = [
  { id: "icheon-termeden", title: "이천 테르메덴", category: "온천·워터파크", distanceLabel: "차로 15분", image: { src: "/images/discovery/reference-main/icheon-termeden.png", alt: "온천 수영장이 있는 이천 테르메덴" } },
  { id: "suwon-hwaseong", title: "수원 화성", category: "역사 문화", distanceLabel: "차로 45분", image: { src: "/images/discovery/reference-main/suwon-hwaseong.png", alt: "성곽길이 이어지는 수원 화성" } },
  { id: "everland", title: "에버랜드", category: "테마파크", distanceLabel: "차로 40분", image: { src: "/images/discovery/reference-main/everland-theme-park.png", alt: "놀이기구가 보이는 용인 에버랜드" } },
] as const;

function programs(prefix: string, labels: readonly [string, string, string, string]) {
  return [
    { id: `${prefix}-rice-bowl`, title: labels[0], description: "지역의 맛과 이야기를 가까이에서 만나는 시간", icon: "rice-bowl" },
    { id: `${prefix}-pavilion`, title: labels[1], description: "축제 공간을 천천히 둘러보는 현장 프로그램", icon: "pavilion" },
    { id: `${prefix}-performance`, title: labels[2], description: "여행의 분위기를 더하는 특별 무대", icon: "performance" },
    { id: `${prefix}-camera`, title: labels[3], description: "기억에 남는 풍경을 사진으로 남겨보세요", icon: "camera" },
  ] as const;
}

function points(prefix: string, labels: readonly [string, string, string, string]) {
  return [
    { id: `${prefix}-leaf`, title: labels[0], description: "계절의 풍경과 함께 여유롭게 즐길 수 있어요", icon: "leaf" },
    { id: `${prefix}-family`, title: labels[1], description: "함께 온 일행 모두가 참여하기 좋은 구성입니다", icon: "family" },
    { id: `${prefix}-food`, title: labels[2], description: "지역에서만 만날 수 있는 먹거리와 체험을 담았어요", icon: "food" },
    { id: `${prefix}-parking`, title: labels[3], description: "대중교통과 자가용으로 방문하기 편리합니다", icon: "parking" },
  ] as const;
}

export const festivalDetails = [
  {
    id: "icheon-rice-cultural-festival", rank: 1, title: "이천쌀문화축제", dateLabel: "2026. 10. 21. – 10. 25.", region: "gyeonggi", location: "이천시 일원", status: "upcoming", isThisWeek: false, isFree: true, audiences: ["family"], tags: ["쌀문화", "가족"], image: { src: "/images/discovery/reference-main/icheon-rice-festival.png", alt: "가을 들판의 이천쌀문화축제" }, rating: 4.7, reviewCount: 1842,
    gallery: [
      { src: "/images/festivals/icheon-rice-cultural-festival/entrance.png", alt: "가을 들판과 축제 입구가 보이는 이천쌀문화축제" },
      { src: "/images/festivals/icheon-rice-cultural-festival/food-experience.png", alt: "쌀 먹거리와 체험을 즐기는 축제 방문객" },
      { src: "/images/festivals/icheon-rice-cultural-festival/culture-stage.png", alt: "전통문화 공연을 관람하는 가족 관객" },
    ],
    introduction: "이천쌀문화축제는 황금빛 들판이 가장 아름다운 계절에 이천의 쌀과 농촌 문화를 만나는 축제입니다. 갓 지은 밥의 향을 따라 걷고, 쌀로 만든 먹거리와 손으로 직접 해보는 체험을 즐길 수 있습니다. 전통 공연과 가족 참여 프로그램이 하루 종일 이어져 아이와 어른이 각자의 속도로 머물기 좋으며, 지역 농부와 생산자의 이야기를 통해 이천쌀이 식탁에 오기까지의 시간을 자연스럽게 알아갈 수 있습니다.",
    programs: programs("icheon", ["가마솥 이천쌀 시식", "농촌 문화 체험", "전통 공연 한마당", "황금 들판 포토존"]), recommendationPoints: points("icheon", ["가을 들판 산책", "가족 체험 중심", "이천쌀 먹거리", "주차장 안내 운영"]), nearbyCourses: icheonCourses,
  },
  {
    id: "jeju-summer-light-garden", rank: 1, title: "제주 여름빛 정원축제", dateLabel: "2026. 8. 22. – 8. 30.", region: "jeju", location: "제주 서귀포시", status: "ongoing", isThisWeek: true, isFree: true, audiences: ["family"], tags: ["가족", "야간"], image: { src: "/images/discovery/festival-jeju.png", alt: "제주 들판에 핀 여름꽃" }, rating: 4.5, reviewCount: 936,
    gallery: [{ src: "/images/discovery/festival-jeju.png", alt: "제주 들판에 핀 여름꽃" }],
    introduction: "제주 여름빛 정원축제는 해가 기울 무렵부터 정원의 꽃과 조명이 어우러지는 여름 밤 산책을 제안합니다. 낮에는 꽃길과 쉼터를 따라 천천히 걷고, 저녁에는 은은한 빛으로 달라지는 정원을 만날 수 있습니다. 가족 단위 방문객이 쉬어 갈 수 있는 휴식 공간과 가벼운 체험 부스가 마련되어 있으며, 제주의 여름 바람을 느끼며 사진과 대화를 남기기 좋은 여유로운 축제입니다.",
    programs: programs("summer-light", ["여름꽃 산책", "빛 정원 해설", "정원 음악 시간", "빛길 사진 산책"]), recommendationPoints: points("summer-light", ["여름밤 정원", "가족 산책 코스", "제주 간식 부스", "인근 공영주차장"]), nearbyCourses: jejuCourses,
  },
  {
    id: "seogwipo-lantern-water", rank: 2, title: "서귀포 등불 물빛축제", dateLabel: "2026. 8. 20. – 9. 6.", region: "jeju", location: "제주 서귀포시", status: "ongoing", isThisWeek: true, isFree: false, audiences: ["friends", "couple"], tags: ["등불", "야경"], image: { src: "/images/discovery/festivals/jeju-lantern-night.png", alt: "제주 정원 연못을 밝히는 밤 등불" }, rating: 4.6, reviewCount: 721,
    gallery: [{ src: "/images/discovery/festivals/jeju-lantern-night.png", alt: "제주 정원 연못을 밝히는 밤 등불" }],
    introduction: "서귀포 등불 물빛축제는 물가를 따라 놓인 등불과 반사되는 빛을 감상하며 걷는 야간 문화 행사입니다. 해가 진 뒤 시작되는 빛길은 낮과 다른 고요한 분위기를 만들고, 작은 공연과 이야기 프로그램이 산책의 리듬을 더합니다. 연인과 친구가 함께 사진을 남기기 좋고, 서귀포의 밤을 조금 더 천천히 경험하고 싶은 여행자에게 어울리는 축제입니다.",
    programs: programs("lantern-water", ["등불 만들기", "물빛 산책", "야간 음악 공연", "등불 포토 스팟"]), recommendationPoints: points("lantern-water", ["물가 야경", "친구와 데이트", "야시장 간식", "셔틀 정류장 안내"]), nearbyCourses: jejuCourses,
  },
  {
    id: "jeju-sea-fireworks-culture", rank: 3, title: "제주 바다불꽃 문화제", dateLabel: "2026. 8. 28. – 8. 29.", region: "jeju", location: "제주 제주시", status: "ongoing", isThisWeek: false, isFree: false, audiences: ["friends", "couple"], tags: ["불꽃", "야경"], image: { src: "/images/discovery/festivals/jeju-fireworks-night.png", alt: "제주 바다 위로 펼쳐지는 밤 불꽃" }, rating: 4.6, reviewCount: 1108,
    gallery: [{ src: "/images/discovery/festivals/jeju-fireworks-night.png", alt: "제주 바다 위로 펼쳐지는 밤 불꽃" }],
    introduction: "제주 바다불꽃 문화제는 바다의 어두운 수평선을 배경으로 음악과 불꽃, 지역 문화 공연을 함께 즐기는 이틀간의 행사입니다. 해질 무렵부터 해변 산책로에 작은 무대와 휴식 공간이 열리고, 밤에는 바다 위로 펼쳐지는 불꽃이 축제의 절정을 만듭니다. 혼잡한 시간에는 안내요원의 동선을 따라 안전하게 이동하며 제주 밤바다의 특별한 장면을 차분히 감상해 보세요.",
    programs: programs("sea-fireworks", ["해변 문화 체험", "바다 산책 안내", "불꽃 전 야외 공연", "불꽃 감상 포인트"]), recommendationPoints: points("sea-fireworks", ["제주 밤바다", "친구와 함께", "해변 푸드트럭", "대중교통 권장"]), nearbyCourses: jejuCourses,
  },
  {
    id: "aewol-blue-sea-market", rank: 4, title: "애월 푸른바다 마켓", dateLabel: "2026. 8. 22. – 8. 23.", region: "jeju", location: "제주 제주시 애월읍", status: "ongoing", isThisWeek: true, isFree: true, audiences: ["family", "friends"], tags: ["마켓", "가족"], image: { src: "/images/discovery/festivals/aewol-seaside-market.png", alt: "애월 바다를 바라보는 야외 공예 마켓" }, rating: 4.4, reviewCount: 508,
    gallery: [{ src: "/images/discovery/festivals/aewol-seaside-market.png", alt: "애월 바다를 바라보는 야외 공예 마켓" }],
    introduction: "애월 푸른바다 마켓은 바다를 바라보는 야외 공간에서 제주 창작자와 로컬 상점을 만나는 주말 마켓입니다. 공예품과 작은 식료품을 구경하고, 현장에서 만든 간식을 맛보며 느긋하게 둘러볼 수 있습니다. 아이와 함께 참여할 수 있는 간단한 만들기 프로그램도 준비되어 있어 가족 여행 중 한나절을 보내기 좋습니다. 바람이 강할 수 있으니 가벼운 겉옷을 챙기면 더 편안합니다.",
    programs: programs("aewol-market", ["로컬 식재료 시식", "공예 마켓 산책", "버스킹 공연", "바다 포토 부스"]), recommendationPoints: points("aewol-market", ["바다 곁 마켓", "가족 만들기", "로컬 먹거리", "주차장 혼잡 안내"]), nearbyCourses: jejuCourses,
  },
  {
    id: "halla-forest-music", rank: 5, title: "한라 숲속 음악회", dateLabel: "2026. 9. 5. – 9. 6.", region: "jeju", location: "제주 제주시", status: "upcoming", isThisWeek: false, isFree: true, audiences: ["friends"], tags: ["음악", "숲"], image: { src: "/images/discovery/festivals/halla-forest-music.png", alt: "제주 숲속에서 열리는 작은 음악회" }, rating: 4.5, reviewCount: 362,
    gallery: [{ src: "/images/discovery/festivals/halla-forest-music.png", alt: "제주 숲속에서 열리는 작은 음악회" }],
    introduction: "한라 숲속 음악회는 나무 사이로 스며드는 바람과 어쿠스틱 음악을 함께 듣는 작은 야외 공연입니다. 공연 전후에는 숲길을 따라 가볍게 걸을 수 있고, 지역 연주자들의 무대가 자연스러운 휴식의 시간을 만듭니다. 큰 소리보다 편안한 감상에 초점을 둔 프로그램이라 친구와 조용히 이야기를 나누거나 혼자 제주의 숲 분위기에 머물고 싶은 여행자에게도 잘 맞습니다.",
    programs: programs("halla-music", ["숲속 차 시음", "생태 해설 산책", "어쿠스틱 라이브", "숲길 기록 사진"]), recommendationPoints: points("halla-music", ["숲의 휴식", "친구와 감상", "지역 음료", "대중교통 연계"]), nearbyCourses: jejuCourses,
  },
  {
    id: "seongsan-sunrise-culture", rank: 6, title: "성산 해맞이 문화마당", dateLabel: "2026. 9. 12. – 9. 13.", region: "jeju", location: "제주 서귀포시 성산읍", status: "upcoming", isThisWeek: false, isFree: true, audiences: ["family"], tags: ["전통", "일출"], image: { src: "/images/discovery/festivals/seongsan-sunrise-culture.png", alt: "성산일출봉 앞에서 해를 맞는 문화 행사" }, rating: 4.7, reviewCount: 644,
    gallery: [{ src: "/images/discovery/festivals/seongsan-sunrise-culture.png", alt: "성산일출봉 앞에서 해를 맞는 문화 행사" }],
    introduction: "성산 해맞이 문화마당은 이른 아침 성산의 바다와 하늘이 밝아오는 시간을 지역 문화 프로그램과 함께 나누는 행사입니다. 일출 전에는 따뜻한 차와 작은 공연이 여행자의 발걸음을 맞이하고, 해가 오른 뒤에는 전통 체험과 지역 이야기 마당이 이어집니다. 가족이 함께 하루를 특별하게 시작하기 좋으며, 일출 시간대에는 기온 차가 있을 수 있어 보온이 되는 옷차림을 권합니다.",
    programs: programs("seongsan-sunrise", ["아침 떡 나눔", "성산 이야기 마당", "해맞이 공연", "일출 사진 안내"]), recommendationPoints: points("seongsan-sunrise", ["성산의 일출", "가족 아침 여행", "지역 아침 먹거리", "이른 주차 안내"]), nearbyCourses: jejuCourses,
  },
] as const satisfies readonly FestivalDetail[];

export function getFestivalDetailById(id: string) {
  return festivalDetails.find((festival) => festival.id === id);
}

export function getFestivalStaticParams() {
  return festivalDetails.map(({ id }) => ({ festivalId: id }));
}
