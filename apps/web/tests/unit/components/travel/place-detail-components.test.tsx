import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlaceDetailActions } from "@/components/travel/place-detail-actions";
import { PlaceDetailHeader } from "@/components/travel/place-detail-header";
import { PlaceDetailPreparation } from "@/components/travel/place-detail-preparation";
import { PlaceDetailTabs } from "@/components/travel/place-detail-tabs";
import { PlaceReviewOverview } from "@/components/travel/place-review-overview";
import { RatingSummary } from "@/components/travel/rating-summary";
import { ReviewCard } from "@/components/travel/review-card";
import { ReviewProviderMark } from "@/components/travel/review-provider-mark";
import { ReviewSourceFilter } from "@/components/travel/review-source-filter";
import { getPlaceDetailById } from "@/features/places/place-detail.mock";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReviewProviderMark", () => {
  it.each([
    ["kakao", "카카오맵"],
    ["google", "구글맵"],
    ["naver", "네이버 블로그"],
  ] as const)("keeps %s recognizable as visible text", (provider, label) => {
    render(<ReviewProviderMark provider={provider} />);

    expect(screen.getByText(label)).toBeVisible();
  });
});

describe("place review presentation variants", () => {
  it("shows raw distribution counts in the purple split summary", () => {
    render(
      <RatingSummary
        value={4.6}
        reviewCount={2345}
        layout="split"
        tone="primary"
        distributionValue="count"
        distribution={[
          { score: 5, count: 1677 },
          { score: 4, count: 466 },
          { score: 3, count: 156 },
          { score: 2, count: 32 },
          { score: 1, count: 14 },
        ]}
      />,
    );

    expect(screen.getByText("1,677")).toBeVisible();
    expect(
      screen.getByRole("meter", { name: "5점 후기 비율" }),
    ).toHaveAttribute("aria-valuenow", "72");
  });

  it("renders review imagery and likes only in the feed variant", () => {
    render(
      <ReviewCard
        variant="feed"
        author="김여행"
        rating={5}
        date="2026.08.12"
        content="시설이 깨끗하고 물도 좋아요!"
        provider="카카오맵"
        providerIcon={<span>provider mark</span>}
        images={[
          {
            src: "/images/places/icheon-termeden/reviews/outdoor-pool.png",
            alt: "야외 온천 수영장",
          },
        ]}
        likeCount={12}
      />,
    );

    expect(
      screen.getByRole("img", { name: "야외 온천 수영장" }),
    ).toBeVisible();
    expect(screen.getByLabelText("좋아요 12개")).toBeVisible();
  });

  it("can prioritize the first above-the-fold review image", () => {
    render(
      <ReviewCard
        variant="feed"
        author="김여행"
        rating={5}
        date="2026.08.12"
        content="시설이 깨끗하고 물도 좋아요!"
        provider="카카오맵"
        images={[
          {
            src: "/images/places/icheon-termeden/reviews/outdoor-pool.png",
            alt: "우선 로딩하는 야외 온천 수영장",
          },
        ]}
        eagerImages
      />,
    );

    expect(
      screen.getByRole("img", { name: "우선 로딩하는 야외 온천 수영장" }),
    ).toHaveAttribute("loading", "eager");
  });
});

describe("place detail navigation and actions", () => {
  it("marks the review tab current and links unfinished tabs", () => {
    render(
      <PlaceDetailTabs placeId="icheon-termeden" currentTab="reviews" />,
    );

    expect(screen.getByRole("link", { name: "후기" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "소개" })).toHaveAttribute(
      "href",
      "/places/icheon-termeden?tab=introduction",
    );
  });

  it("keeps the current review source in the URL-backed filter", () => {
    render(
      <ReviewSourceFilter
        placeId="icheon-termeden"
        currentSource="kakao"
      />,
    );

    expect(screen.getByRole("link", { name: "카카오맵" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "전체" })).toHaveAttribute(
      "href",
      "/places/icheon-termeden",
    );
  });

  it("shows the approved preparation copy for unfinished tabs", () => {
    render(
      <PlaceDetailPreparation
        placeId="icheon-termeden"
        tab="course"
      />,
    );

    expect(screen.getByText("추천 코스를 준비하고 있어요")).toBeVisible();
    expect(screen.getByRole("link", { name: "후기 먼저 보기" })).toHaveAttribute(
      "href",
      "/places/icheon-termeden",
    );
  });

  it("renders the review count and full distribution in the overview", () => {
    const place = getPlaceDetailById("icheon-termeden");
    expect(place).toBeDefined();
    if (!place) return;

    render(<PlaceReviewOverview place={place} />);

    expect(screen.getByRole("heading", { name: /통합 후기/ })).toHaveTextContent(
      "2,345개",
    );
    expect(screen.getAllByRole("meter")).toHaveLength(5);
  });

  it("returns home without traversing tab history", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 4,
    });

    render(<PlaceDetailHeader title="이천 테르메덴" />);

    await user.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(routerMocks.replace).toHaveBeenCalledWith("/");
    expect(routerMocks.back).not.toHaveBeenCalled();
  });

  it("toggles the local save state", async () => {
    const user = userEvent.setup();
    render(<PlaceDetailHeader title="이천 테르메덴" />);

    const saveButton = screen.getByRole("button", {
      name: "이천 테르메덴 찜하기",
    });
    await user.click(saveButton);

    expect(saveButton).toHaveAttribute("aria-pressed", "true");
  });

  it("copies the current URL when native sharing is unavailable", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<PlaceDetailHeader title="이천 테르메덴" />);
    await user.click(screen.getByRole("button", { name: "공유하기" }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole("status")).toHaveTextContent("링크를 복사했어요");
  });

  it("explains that review writing is not implemented yet", async () => {
    const user = userEvent.setup();
    render(<PlaceDetailActions />);

    await user.click(screen.getByRole("button", { name: "후기 작성하기" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "후기 작성 기능을 준비하고 있어요",
    );
  });
});
