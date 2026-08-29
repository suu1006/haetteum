import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import { FestivalDetailScreen } from "@/components/patterns/festival-detail-screen";
import type { FestivalDetailView } from "@/features/festivals/festival-detail-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
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
  mapUrl: "https://map.kakao.com/link/map/%EC%B6%95%EC%A0%9C,37.5,127.0",
  overview: "도심형 여름 축제입니다.",
  program: "1. 메인프로그램: 메인 스테이지\n2. 부대프로그램: 비어 테라스",
  eventInfo: [
    { id: "place", label: "행사 장소", value: "장안1수변공원" },
    { id: "time", label: "행사 시간", value: "17:00~22:00" },
  ],
  primaryImage: {
    src: "https://tong.visitkorea.or.kr/cms/resource/21/a.jpg",
    alt: "대표 이미지",
  },
  gallery: [
    {
      src: "https://tong.visitkorea.or.kr/cms/resource/20/b.jpg",
      alt: "정문",
    },
  ],
};

describe("FestivalDetailScreen", () => {
  it("renders the approved section order and reserves fixed-action space", () => {
    const { container } = render(
      <FestivalDetailScreen festival={festival} />,
    );

    expect(
      Array.from(container.querySelectorAll("[data-detail-region]")).map(
        (node) => node.getAttribute("data-detail-region"),
      ),
    ).toEqual([
      "header",
      "gallery",
      "summary",
      "introduction",
      "event-info",
      "program",
      "actions",
    ]);
    expect(container.firstElementChild).toHaveClass(
      "pb-[var(--festival-detail-action-reserve)]",
    );
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /홈페이지/ })).toHaveAttribute(
      "href",
      festival.homepage,
    );
    expect(screen.getByRole("link", { name: /지도보기/ })).toHaveAttribute(
      "href",
      festival.mapUrl,
    );
  });

  it("omits the introduction, event info, and program regions when data is missing, and drops the action reserve", () => {
    const { container } = render(
      <FestivalDetailScreen
        festival={{
          ...festival,
          overview: null,
          eventInfo: [],
          program: null,
          homepage: null,
          mapUrl: null,
        }}
      />,
    );

    expect(
      Array.from(container.querySelectorAll("[data-detail-region]")).map(
        (node) => node.getAttribute("data-detail-region"),
      ),
    ).toEqual(["header", "gallery", "summary", "actions"]);
    expect(container.firstElementChild).not.toHaveClass(
      "pb-[var(--festival-detail-action-reserve)]",
    );
    expect(screen.queryByRole("link", { name: /홈페이지/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /지도보기/ })).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <FestivalDetailScreen festival={festival} />,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
