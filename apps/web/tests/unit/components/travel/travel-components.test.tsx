import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

async function loadModule<T>(modulePath: string) {
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<T | null>;
}

describe("PlaceCard", () => {
  it("reports the next saved state through an accessible control", async () => {
    const placeModule = await loadModule<
      typeof import("@/components/travel/place-card")
    >("@/components/travel/place-card");

    expect(placeModule).not.toBeNull();
    if (!placeModule) return;

    const user = userEvent.setup();
    const onSavedChange = vi.fn();

    render(
      <placeModule.PlaceCard
        title="성산일출봉"
        location="제주 서귀포시"
        rating={4.8}
        reviewCount={1284}
        saved={false}
        onSavedChange={onSavedChange}
        media={<div aria-label="성산일출봉 풍경" />}
      />,
    );

    expect(
      screen.getByRole("article", { name: "성산일출봉" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "성산일출봉 저장" }),
    );
    expect(onSavedChange).toHaveBeenCalledWith(true);
  });
});

describe("RatingSummary", () => {
  it("exposes the same rounded distribution shown by its bar", async () => {
    const ratingModule = await loadModule<
      typeof import("@/components/travel/rating-summary")
    >("@/components/travel/rating-summary");

    expect(ratingModule).not.toBeNull();
    if (!ratingModule) return;

    render(
      <ratingModule.RatingSummary
        value={4.8}
        reviewCount={1284}
        distribution={[{ score: 5, count: 900 }]}
      />,
    );

    expect(
      screen.getByRole("region", { name: "평점 4.8점, 후기 1,284개" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("meter", { name: "5점 후기 비율" }),
    ).toHaveAttribute("aria-valuenow", "70");
  });
});

describe("ProviderBadge", () => {
  it("keeps the review source available as text", async () => {
    const providerModule = await loadModule<
      typeof import("@/components/travel/provider-badge")
    >("@/components/travel/provider-badge");

    expect(providerModule).not.toBeNull();
    if (!providerModule) return;

    render(<providerModule.ProviderBadge provider="네이버 여행" />);

    expect(screen.getByText("네이버 여행")).toBeVisible();
  });
});

describe("ReviewCard", () => {
  it("groups author, source and review copy in a named article", async () => {
    const reviewModule = await loadModule<
      typeof import("@/components/travel/review-card")
    >("@/components/travel/review-card");

    expect(reviewModule).not.toBeNull();
    if (!reviewModule) return;

    render(
      <reviewModule.ReviewCard
        author="여행자 민지"
        rating={5}
        date="2026. 8. 12."
        content="아침 일찍 가니 조용하게 일출을 볼 수 있었어요."
        provider="네이버 여행"
      />,
    );

    expect(
      screen.getByRole("article", { name: "여행자 민지의 후기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("네이버 여행")).toBeVisible();
    expect(
      screen.getByText("아침 일찍 가니 조용하게 일출을 볼 수 있었어요."),
    ).toBeVisible();
  });
});

describe("ItineraryItem", () => {
  it("identifies the current step with text as well as color", async () => {
    const itineraryModule = await loadModule<
      typeof import("@/components/travel/itinerary-item")
    >("@/components/travel/itinerary-item");

    expect(itineraryModule).not.toBeNull();
    if (!itineraryModule) return;

    render(
      <ol>
        <itineraryModule.ItineraryItem
          order={2}
          time="14:30"
          title="해안 산책로"
          location="제주 제주시"
          status="current"
        />
      </ol>,
    );

    expect(screen.getByRole("listitem")).toHaveAttribute(
      "data-status",
      "current",
    );
    expect(screen.getByText("현재 일정")).toBeVisible();
  });
});
