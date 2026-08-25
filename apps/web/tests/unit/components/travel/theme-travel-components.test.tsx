import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UmbrellaIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { ThemeCourseCard } from "@/components/travel/theme-course-card";
import { ThemeFeatureCard } from "@/components/travel/theme-feature-card";
import { themeTravelMock } from "@/features/themes/theme-travel.mock";

describe("ThemeFeatureCard", () => {
  it("selects its theme from a named portrait card", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ThemeFeatureCard
        eager
        feature={themeTravelMock.features[0]}
        icon={<UmbrellaIcon aria-hidden="true" />}
        onSelect={onSelect}
      />,
    );

    const card = screen.getByRole("button", { name: /힐링 & 휴식/ });
    expect(card).toHaveClass("aspect-[3/5]");
    expect(card).toHaveTextContent("128개 코스");
    const arrowIcon = card.querySelector(".lucide-arrow-right");
    expect(arrowIcon).toHaveClass("size-3.5");
    expect(arrowIcon?.parentElement).toHaveClass("size-6");
    expect(
      screen.getByRole("img", {
        name: "야자수 너머로 펼쳐진 푸른 바다와 해변",
      }),
    ).toHaveAttribute("loading", "eager");

    await user.click(card);

    expect(onSelect).toHaveBeenCalledWith("healing");
  });
});

describe("ThemeCourseCard", () => {
  it("renders course metadata and toggles its bookmark contract", async () => {
    const user = userEvent.setup();
    const onSavedChange = vi.fn();

    render(
      <ThemeCourseCard
        course={themeTravelMock.courses[0]}
        eager
        onSavedChange={onSavedChange}
        saved={false}
      />,
    );

    const card = screen.getByRole("article", {
      name: "제주 바다 힐링 코스",
    });
    expect(card).toHaveTextContent("2박 3일");
    expect(card).toHaveTextContent("제주도");
    expect(card).toHaveTextContent("4.8");
    expect(card).toHaveTextContent("(128)");
    expect(card).toHaveTextContent("#바다");

    const saveButton = screen.getByRole("button", {
      name: "제주 바다 힐링 코스 저장",
    });
    expect(saveButton).toHaveAttribute("aria-pressed", "false");

    await user.click(saveButton);

    expect(onSavedChange).toHaveBeenCalledWith(true);
  });

  it("exposes the saved state and cancellation label", () => {
    render(
      <ThemeCourseCard
        course={themeTravelMock.courses[1]}
        onSavedChange={() => undefined}
        saved
      />,
    );

    expect(
      screen.getByRole("button", { name: "전주 미식 탐방 코스 저장 취소" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the theme badge colored while rendering hashtags in neutral gray", () => {
    render(
      <ThemeCourseCard
        course={themeTravelMock.courses[0]}
        onSavedChange={() => undefined}
        saved={false}
      />,
    );

    expect(screen.getByText("힐링 & 휴식")).toHaveClass("text-theme-food");
    expect(screen.getByText("#바다")).toHaveClass(
      "bg-secondary",
      "text-muted-foreground",
    );
  });

  it("uses a flexible minimum height so the footer is not clipped", () => {
    render(
      <ThemeCourseCard
        course={themeTravelMock.courses[0]}
        onSavedChange={() => undefined}
        saved={false}
      />,
    );

    const card = screen.getByRole("article", {
      name: "제주 바다 힐링 코스",
    });
    expect(card).toHaveClass("min-h-[8.25rem]");
    expect(card).not.toHaveClass("h-[6.25rem]", "min-h-0");
  });
});
