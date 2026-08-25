import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { exploreMock } from "@/features/explore/explore.mock";

describe("ExploreScreen", () => {
  it("assembles the approved exploration sections and active navigation", () => {
    render(<ExploreScreen data={exploreMock} region="gyeonggi" />);

    expect(screen.getByRole("heading", { level: 1, name: "탐색" })).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "여행지 검색" }),
    ).toHaveAttribute("placeholder", "어디로 떠나볼까요?");
    expect(
      within(screen.getByRole("navigation", { name: "탐색 카테고리" }))
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "인기 관광지",
      "관광 축제",
      "테마 여행",
      "여행 코스",
      "숙소 추천",
    ]);

    expect(
      screen.getByRole("heading", { name: "지금 뜨는 여행지" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "지금 뜨는 여행지" }))
        .getAllByRole("article")
        .map((article) => article.getAttribute("aria-label")),
    ).toEqual(["1위 제주도", "2위 강릉", "3위 여수"]);

    expect(
      screen.getByRole("heading", { name: "지역별 추천 여행지" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "경기" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "서울" })).toHaveAttribute(
      "href",
      "/explore?region=seoul#regional-destinations",
    );
    expect(
      within(screen.getByRole("list", { name: "경기 추천 여행지" }))
        .getAllByRole("article")
        .map((article) => article.getAttribute("aria-label")),
    ).toEqual(["파주 헤이리마을", "가평 아침고요수목원", "용인 한국민속촌"]);

    expect(screen.getByRole("link", { name: "탐색" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <ExploreScreen data={exploreMock} region="gyeonggi" />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
