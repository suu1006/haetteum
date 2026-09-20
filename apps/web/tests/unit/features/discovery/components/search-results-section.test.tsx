import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchResultsSection } from "@/features/discovery/components/search-results-section";
import { parseDiscoveryQuery } from "@/features/discovery/discovery-model";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const place = {
  id: "84549352-0c20-4e11-af50-2d4f278f41ef",
  title: "경복궁",
  region: "seoul" as const,
  district: "종로구",
  address: "서울 종로구",
  longitude: 126.977,
  latitude: 37.579,
  primaryImageUrl: null,
  imageCopyrightType: null,
};
const external = {
  provider: "KAKAO_LOCAL" as const,
  providerPlaceId: "123",
  title: "새로운 정원",
  categoryLabel: "관광명소",
  telephone: null,
  address: "서울 종로구",
  roadAddress: null,
  longitude: 126.977,
  latitude: 37.579,
  distanceMeters: null,
  placeUrl: "https://place.map.kakao.com/123",
  imageUrl: null,
  matchedPlaceId: null,
};
const query = parseDiscoveryQuery({ q: "경복궁", searchRegion: "seoul" });

describe("search result fallback", () => {
  it("offers more search while retaining existing DB results", () => {
    render(
      <SearchResultsSection
        query={query}
        results={{ status: "ready", items: [place] }}
      />,
    );
    expect(screen.getByRole("link", { name: /경복궁 서울/ })).toBeVisible();
    const url = new URL(
      screen
        .getByRole("link", { name: "다른 장소 더 찾아보기" })
        .getAttribute("href")!,
      "https://test.local",
    );
    expect(url.searchParams.get("external")).toBe("1");
    expect(url.searchParams.has("searchRegion")).toBe(false);
  });
  it("shows external matches instead of a false empty state and removes stored duplicates", () => {
    render(
      <SearchResultsSection
        query={query}
        results={{
          status: "ready",
          items: [place],
          external: {
            status: "ready",
            items: [
              { ...external, title: "경복궁", matchedPlaceId: place.id },
              { ...external, providerPlaceId: "456" },
            ],
          },
        }}
      />,
    );
    expect(screen.getAllByRole("link", { name: /경복궁 서울/ })).toHaveLength(
      1,
    );
    expect(screen.getByRole("button", { name: /새로운 정원/ })).toBeVisible();
    expect(screen.queryByText(/검색 결과가 없어요/)).not.toBeInTheDocument();
  });
  it("does not duplicate internal matches absent from the first DB page", () => {
    render(
      <SearchResultsSection
        query={query}
        results={{
          status: "ready",
          items: [],
          external: {
            status: "ready",
            items: [
              { ...external, matchedPlaceId: place.id },
              { ...external, providerPlaceId: "456", matchedPlaceId: place.id },
            ],
          },
        }}
      />,
    );
    expect(screen.getAllByRole("link", { name: /새로운 정원/ })).toHaveLength(
      1,
    );
  });
  it("keeps an external outage distinct from an empty search", () => {
    render(
      <SearchResultsSection
        query={query}
        results={{
          status: "ready",
          items: [],
          external: { status: "unavailable", reason: "provider_unavailable" },
        }}
      />,
    );
    expect(screen.getByText("추가 장소를 불러오지 못했어요.")).toBeVisible();
    expect(screen.queryByText(/검색 결과가 없어요/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도하기" })).toBeVisible();
  });
});
