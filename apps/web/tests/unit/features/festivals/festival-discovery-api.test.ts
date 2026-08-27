import { describe, expect, it, vi } from "vitest";

import { loadFestivalDiscovery } from "@/features/festivals/festival-discovery-api";

const response = {
  asOfDate: "2026-08-25",
  region: "jeju",
  ranking: [
    {
      id: "84549352-0c20-4e11-af50-2d4f278f41ef",
      externalId: "141268",
      rank: 1,
      title: "제주 실데이터 축제",
      status: "ONGOING",
      eventStartDate: "2026-08-22",
      eventEndDate: "2026-09-06",
      address: "제주특별자치도 제주시 테스트로 1",
      categoryLabel: "문화관광축제",
      primaryImageUrl: "https://tong.visitkorea.or.kr/test.jpg",
    },
  ],
  items: [
    {
      id: "84549352-0c20-4e11-af50-2d4f278f41ef",
      externalId: "141268",
      title: "제주 실데이터 축제",
      status: "ONGOING",
      eventStartDate: "2026-08-22",
      eventEndDate: "2026-09-06",
      address: "제주특별자치도 제주시 테스트로 1",
      categoryLabel: "문화관광축제",
      primaryImageUrl: "https://tong.visitkorea.or.kr/test.jpg",
    },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 1,
} as const;

describe("loadFestivalDiscovery", () => {
  it("fetches without caching, validates, and maps factual display data", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await loadFestivalDiscovery(
      "jeju",
      fetchImpl,
      "http://localhost:4000/api/v1",
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/festivals/discovery?region=jeju&page=1&pageSize=20",
      { cache: "no-store" },
    );
    expect(result).toMatchObject({
      loadState: "ready",
      ranking: [
        {
          id: "84549352-0c20-4e11-af50-2d4f278f41ef",
          rank: 1,
          title: "제주 실데이터 축제",
          status: "ongoing",
          statusLabel: "진행 중",
          dateLabel: "2026. 8. 22. – 9. 6.",
          location: "제주특별자치도 제주시 테스트로 1",
          categoryLabel: "문화관광축제",
          image: {
            src: "https://tong.visitkorea.or.kr/test.jpg",
            alt: "제주 실데이터 축제 대표 이미지",
          },
        },
      ],
      festivals: [
        expect.objectContaining({
          title: "제주 실데이터 축제",
          status: "ongoing",
        }),
      ],
    });
  });

  it.each([
    { label: "a missing API base URL", baseUrl: "", response: undefined },
    {
      label: "a non-success response",
      baseUrl: "http://localhost:4000/api/v1",
      response: new Response("failure", { status: 503 }),
    },
    {
      label: "malformed JSON",
      baseUrl: "http://localhost:4000/api/v1",
      response: new Response("not-json", { status: 200 }),
    },
    {
      label: "a schema mismatch",
      baseUrl: "http://localhost:4000/api/v1",
      response: new Response(JSON.stringify({ ...response, items: [{}] }), {
        status: 200,
      }),
    },
  ])("returns an explicit error state for $label", async ({ baseUrl, response }) => {
    const fetchImpl = vi.fn<typeof fetch>();
    if (response) fetchImpl.mockResolvedValue(response);

    await expect(
      loadFestivalDiscovery("all", fetchImpl, baseUrl),
    ).resolves.toMatchObject({
      loadState: "error",
      ranking: [],
      festivals: [],
    });
  });
});
