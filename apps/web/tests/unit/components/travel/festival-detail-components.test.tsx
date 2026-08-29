import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FestivalDetailActions } from "@/components/travel/festival-detail-actions";
import { FestivalDetailHeader } from "@/components/travel/festival-detail-header";
import { FestivalGallery } from "@/components/travel/festival-gallery";
import { FestivalIntroduction } from "@/components/travel/festival-introduction";
import { FestivalSummary } from "@/components/travel/festival-summary";
import type { FestivalDetailView } from "@/features/festivals/festival-detail-model";

const routerMocks = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

const festival: FestivalDetailView = {
  id: "21c0f38f-de9f-46ce-9d98-08e6154886d3",
  title: "동대문구 맥주축제",
  status: "ongoing",
  statusLabel: "진행 중",
  dateLabel: "2026. 8. 28. – 8. 29.",
  location: "서울특별시 동대문구 장안동 24-1",
  categoryLabel: "문화예술축제",
  telephone: "02-3291-5506",
  homepage: "https://www.ddmac.or.kr/",
  mapUrl: null,
  overview: "도심형 여름 축제입니다.",
  program: null,
  eventInfo: [],
  primaryImage: null,
  gallery: [
    { src: "https://tong.visitkorea.or.kr/cms/resource/1/a.jpg", alt: "1" },
    { src: "https://tong.visitkorea.or.kr/cms/resource/2/b.jpg", alt: "2" },
    { src: "https://tong.visitkorea.or.kr/cms/resource/3/c.jpg", alt: "3" },
  ],
};

describe("festival detail presentation components", () => {
  it("renders summary status, category, schedule, location and phone", () => {
    render(<FestivalSummary festival={festival} />);

    expect(screen.getByRole("heading", { name: festival.title })).toBeVisible();
    expect(screen.getByText("진행 중")).toBeVisible();
    expect(screen.getByText("문화예술축제")).toBeVisible();
    expect(screen.getByText(festival.dateLabel)).toBeVisible();
    expect(screen.getByText(festival.location)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "02-3291-5506" }),
    ).toHaveAttribute("href", "tel:02-3291-5506");
  });

  it("omits the phone row when the festival has no telephone", () => {
    render(<FestivalSummary festival={{ ...festival, telephone: null }} />);

    expect(screen.queryByRole("link", { name: /\d/ })).toBeNull();
  });

  it("toggles the local saved state", async () => {
    const user = userEvent.setup();
    render(<FestivalDetailHeader title="동대문구 맥주축제" />);
    const save = screen.getByRole("button", { name: "축제 찜하기" });

    expect(screen.getByText("동대문구 맥주축제")).toHaveClass(
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
    render(<FestivalDetailHeader title="동대문구 맥주축제" />);

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
      <FestivalIntroduction introduction="도심형 여름 축제를 자세히 소개하는 긴 문장입니다. 수변공간을 배경으로 다양한 프로그램이 진행됩니다." />,
    );

    await user.click(screen.getByRole("button", { name: "축제 소개 더보기" }));

    expect(screen.getByRole("button", { name: "축제 소개 접기" })).toBeVisible();
    scrollHeight.mockRestore();
    clientHeight.mockRestore();
  });

  it("renders a custom section title for reuse as a program block", () => {
    render(
      <FestivalIntroduction
        title="프로그램"
        introduction={"1. 메인프로그램\n2. 부대프로그램"}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "프로그램" }),
    ).toBeVisible();
    expect(screen.queryByText("축제 소개")).not.toBeInTheDocument();
  });

  it("links the left button to the homepage and the right button to the map", () => {
    render(
      <FestivalDetailActions
        homepage="https://www.ddmac.or.kr/"
        mapUrl="https://map.kakao.com/link/map/%EC%B6%95%EC%A0%9C,37.5,127.0"
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAccessibleName(/홈페이지/);
    expect(links[0]).toHaveAttribute("href", "https://www.ddmac.or.kr/");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[1]).toHaveAccessibleName(/지도보기/);
    expect(links[1]).toHaveAttribute(
      "href",
      "https://map.kakao.com/link/map/%EC%B6%95%EC%A0%9C,37.5,127.0",
    );
  });

  it("renders only the available link when the other is missing", () => {
    render(<FestivalDetailActions homepage="https://www.ddmac.or.kr/" mapUrl={null} />);

    expect(screen.getByRole("link", { name: /홈페이지/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /지도보기/ })).not.toBeInTheDocument();
  });

  it("renders nothing when neither the homepage nor the map link is available", () => {
    const { container } = render(
      <FestivalDetailActions homepage={null} mapUrl={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
