import type { ExploreData } from "@/features/explore/explore-model";

const exploreMock = {
  regions: [
    { id: "seoul", label: "서울" },
    { id: "gyeonggi", label: "경기" },
    { id: "gangwon", label: "강원" },
    { id: "busan", label: "부산" },
    { id: "jeju", label: "제주" },
  ],
} satisfies ExploreData;

export { exploreMock };
