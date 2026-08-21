import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

async function loadModule<T>(modulePath: string) {
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<T | null>;
}

describe("WelcomeHero", () => {
  it("introduces the three welcome features through reusable cards", async () => {
    const welcomeModule = await loadModule<
      typeof import("@/components/patterns/welcome-hero")
    >("@/components/patterns/welcome-hero");

    expect(welcomeModule).not.toBeNull();
    if (!welcomeModule) return;

    render(<welcomeModule.WelcomeHero />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "여행, 지금 가장 스마트하게!",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByText("인기 관광지 순위")).toBeVisible();
    expect(screen.getByText("AI 맞춤 여행 코스")).toBeVisible();
    expect(screen.getByText("통합 후기 탐색")).toBeVisible();
  });

  it("keeps the primary journey available while login is undecided", async () => {
    const welcomeModule = await loadModule<
      typeof import("@/components/patterns/welcome-hero")
    >("@/components/patterns/welcome-hero");

    expect(welcomeModule).not.toBeNull();
    if (!welcomeModule) return;

    render(<welcomeModule.WelcomeHero />);

    expect(
      screen.getByRole("link", { name: "여행 시작하기" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "로그인" })).toBeDisabled();
  });

  it("has no detectable accessibility violations", async () => {
    const welcomeModule = await loadModule<
      typeof import("@/components/patterns/welcome-hero")
    >("@/components/patterns/welcome-hero");

    expect(welcomeModule).not.toBeNull();
    if (!welcomeModule) return;

    const { container } = render(<welcomeModule.WelcomeHero />);
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
