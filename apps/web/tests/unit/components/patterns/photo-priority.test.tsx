import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoPriorityRankingList } from "@/components/travel/photo-priority-ranking-list";
import { SearchResultsSection } from "@/components/patterns/search-results-section";
import { defaultDiscoveryQuery } from "@/features/discovery/discovery-model";

const items = [
  null,
  "https://tong.visitkorea.or.kr/two.jpg",
  "https://tong.visitkorea.or.kr/three.jpg",
  "https://invalid.example/four.jpg",
].map((primaryImageUrl, i) => ({
  rank: i + 1,
  sourcePlaceId: String(i),
  title: `장소${i + 1}`,
  category: "관광지",
  sharePercent: 10,
  placeId: null,
  primaryImageUrl,
  imageCopyrightType: "Type1",
  imageAttribution: null,
  imageAttributionUrl: null,
}));
describe("photo-first ranking and inclusive search", () => {
  it("puts photos first without changing original ranks or mutating API data", () => {
    render(
      <PhotoPriorityRankingList kind="popular" items={items} label="순위" />,
    );
    expect(
      within(screen.getByRole("list", { name: "순위" }))
        .getAllByRole("article")
        .map((n) => n.getAttribute("aria-label")),
    ).toEqual(["2위 장소2", "3위 장소3", "1위 장소1", "4위 장소4"]);
    expect(items.map((p) => p.rank)).toEqual([1, 2, 3, 4]);
    expect(
      screen.queryByRole("img", { name: "장소1" }),
    ).not.toBeInTheDocument();
  });
  it("moves a failed image behind healthy photos without hiding the ranked place", () => {
    render(
      <PhotoPriorityRankingList kind="popular" items={items} label="순위" />,
    );
    fireEvent.error(screen.getByRole("img", { name: "장소2" }));
    expect(
      within(screen.getByRole("list", { name: "순위" }))
        .getAllByRole("article")
        .map((n) => n.getAttribute("aria-label")),
    ).toEqual(["3위 장소3", "1위 장소1", "2위 장소2", "4위 장소4"]);
    expect(
      screen.queryByRole("img", { name: "장소2" }),
    ).not.toBeInTheDocument();
  });
  it("applies the same photo-first policy to hot-place rankings", () => {
    render(
      <PhotoPriorityRankingList
        kind="hot"
        items={items.map((p) => ({
          rank: p.rank,
          sourcePlaceId: p.sourcePlaceId,
          title: p.title,
          category: p.category,
          placeId: p.placeId,
          primaryImageUrl: p.primaryImageUrl,
          imageCopyrightType: p.imageCopyrightType,
          imageAttribution: p.imageAttribution,
          imageAttributionUrl: p.imageAttributionUrl,
          growthPercent: 5,
          provinceName: "서울",
          districtName: "종로",
        }))}
        label="핫플"
      />,
    );
    expect(
      within(screen.getByRole("list", { name: "핫플" })).getAllByRole(
        "article",
      )[0],
    ).toHaveAccessibleName("2위 장소2");
    expect(screen.getAllByText("방문 급상승 5.0%")).toHaveLength(4);
  });
  it("keeps all search results and their original order when photos are missing or fail", () => {
    render(
      <SearchResultsSection
        query={{ ...defaultDiscoveryQuery, q: "장소" }}
        results={{
          status: "ready",
          items: items.map((p, i) => ({
            id: String(i),
            title: p.title,
            region: "seoul",
            district: null,
            address: "서울 주소",
            longitude: 127,
            latitude: 37,
            primaryImageUrl: p.primaryImageUrl,
            imageCopyrightType: null,
          })),
        }}
      />,
    );
    const list = screen.getByRole("list", { name: "'장소' 검색 결과" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((n) => n.textContent),
    ).toEqual([
      "장소1서울 주소",
      "장소2서울 주소",
      "장소3서울 주소",
      "장소4서울 주소",
    ]);
    expect(within(list).getAllByRole("img")).toHaveLength(2);
    fireEvent.error(screen.getByRole("img", { name: "장소2 대표 이미지" }));
    expect(within(list).getAllByRole("link")).toHaveLength(4);
    expect(within(list).getAllByRole("img")).toHaveLength(1);
    expect(screen.getByText("장소2")).toBeVisible();
  });
});
