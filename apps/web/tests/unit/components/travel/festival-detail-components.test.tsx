import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FestivalDetailActions } from "@/components/travel/festival-detail-actions";
import { FestivalDetailHeader } from "@/components/travel/festival-detail-header";
import { FestivalGallery } from "@/components/travel/festival-gallery";
import { FestivalIntroduction } from "@/components/travel/festival-introduction";
import { FestivalProgramGrid } from "@/components/travel/festival-program-grid";
import { FestivalRecommendationPoints } from "@/components/travel/festival-recommendation-points";
import { FestivalSummary } from "@/components/travel/festival-summary";
import { NearbyCourseList } from "@/components/travel/nearby-course-list";
import { festivalDetails } from "@/features/festivals/festival-detail.mock";

const routerMocks = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

const festival = festivalDetails[0];

describe("festival detail presentation components", () => {
  it("renders summary metadata and tags", () => {
    render(<FestivalSummary festival={festival} />);

    expect(screen.getByRole("heading", { name: festival.title })).toBeVisible();
    expect(screen.getByText(festival.dateLabel)).toBeVisible();
    expect(screen.getByText(festival.location)).toBeVisible();
    expect(screen.getByText(`${festival.rating.toFixed(1)}`)).toBeVisible();
  });

  it("renders every named program and recommendation point", () => {
    render(
      <>
        <FestivalProgramGrid programs={festival.programs} />
        <FestivalRecommendationPoints points={festival.recommendationPoints} />
      </>,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });

  it("renders nearby courses as an image list", () => {
    render(<NearbyCourseList courses={festival.nearbyCourses} />);

    expect(
      within(screen.getByRole("list", { name: "주변 추천 코스" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(3);
  });

  it("toggles the local saved state", async () => {
    const user = userEvent.setup();
    render(<FestivalDetailHeader title="이천쌀문화축제" />);
    const save = screen.getByRole("button", { name: "축제 찜하기" });

    expect(screen.getByText("이천쌀문화축제")).toHaveClass(
      "pointer-events-none",
    );

    await user.click(save);

    expect(screen.getByRole("button", { name: "축제 찜 해제" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("copies the page URL when Web Share is unavailable", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    render(<FestivalDetailHeader title="이천쌀문화축제" />);

    await user.click(screen.getByRole("button", { name: "축제 공유" }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole("status")).toHaveTextContent("링크를 복사했어요");
  });

  it("updates the gallery counter after scrolling to the second image", () => {
    render(<FestivalGallery gallery={festival.gallery} />);
    const gallery = screen.getByRole("list", { name: "축제 이미지" });
    Object.defineProperty(gallery, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(gallery, "scrollLeft", {
      configurable: true,
      value: 320,
    });

    expect(screen.getByText("1/3")).toBeVisible();
    fireEvent.scroll(gallery);
    expect(screen.getByText("2/3")).toBeVisible();
  });

  it("expands and collapses the introduction", async () => {
    const user = userEvent.setup();
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(96);
    const clientHeight = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockReturnValue(42);
    render(
      <FestivalIntroduction introduction="임금님표 이천쌀의 우수성을 알리고 온 가족이 체험과 공연을 즐기는 축제 소개 문장입니다." />,
    );

    await user.click(screen.getByRole("button", { name: "축제 소개 더보기" }));

    expect(screen.getByRole("button", { name: "축제 소개 접기" })).toBeVisible();
    scrollHeight.mockRestore();
    clientHeight.mockRestore();
  });

  it("announces schedule and directions as upcoming features", async () => {
    const user = userEvent.setup();
    render(<FestivalDetailActions />);

    await user.click(screen.getByRole("button", { name: "일정에 추가" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "일정 추가는 준비 중인 기능이에요",
    );
  });

  it("announces the nearby course expansion as an upcoming feature", async () => {
    const user = userEvent.setup();
    render(<NearbyCourseList courses={festival.nearbyCourses} />);
    const summary = screen.getByText("전체보기");

    expect(summary.tagName).toBe("SUMMARY");
    await user.click(summary);

    expect(screen.getByRole("status")).toHaveTextContent(
      "주변 코스 전체보기는 준비 중인 기능이에요",
    );
  });
});
