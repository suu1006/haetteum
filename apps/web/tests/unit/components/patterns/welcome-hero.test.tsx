import { act, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadModule<T>(modulePath: string) {
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<T | null>;
}

function stubMatchMedia({
  desktop = true,
  reducedMotion = false,
}: {
  desktop?: boolean;
  reducedMotion?: boolean;
} = {}) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMotion
        : desktop,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

  it("keeps discovery available and links to the login journey", async () => {
    const welcomeModule = await loadModule<
      typeof import("@/components/patterns/welcome-hero")
    >("@/components/patterns/welcome-hero");

    expect(welcomeModule).not.toBeNull();
    if (!welcomeModule) return;

    render(<welcomeModule.WelcomeHero />);

    expect(
      screen.getByRole("link", { name: "여행 시작하기" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("art directs portrait and landscape imagery by viewport", async () => {
    const welcomeModule = await loadModule<
      typeof import("@/components/patterns/welcome-hero")
    >("@/components/patterns/welcome-hero");

    expect(welcomeModule).not.toBeNull();
    if (!welcomeModule) return;

    const { container } = render(<welcomeModule.WelcomeHero />);
    const picture = container.querySelector("picture");
    const desktopSource = picture?.querySelector(
      'source[media="(min-width: 1024px)"]',
    );
    const mobileSource = picture?.querySelector(
      'source[media="(max-width: 1023px)"]',
    );
    const mobileImage = picture?.querySelector("img");

    expect(desktopSource).toHaveAttribute(
      "srcset",
      expect.stringContaining("welcome-lake-desktop.png"),
    );
    expect(desktopSource).toHaveAttribute("sizes", "100vw");
    expect(mobileImage).toHaveAttribute(
      "src",
      expect.stringContaining("welcome-balloon-valley-v2.png"),
    );
    expect(mobileSource).toHaveAttribute(
      "srcset",
      expect.stringContaining("welcome-balloon-valley-v2.png"),
    );
    expect(mobileSource).toHaveAttribute(
      "sizes",
      "(min-width: 768px) 480px, 100vw",
    );
  });

  it("presents the approved desktop travel-planning conversation", async () => {
    const welcomeModule = await loadModule<
      typeof import("@/components/patterns/welcome-hero")
    >("@/components/patterns/welcome-hero");

    expect(welcomeModule).not.toBeNull();
    if (!welcomeModule) return;

    render(<welcomeModule.WelcomeHero />);

    const conversation = screen.getByRole("list", {
      name: "여행 계획 대화",
    });

    expect(within(conversation).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(conversation).getByText("오늘 우리 어디 놀러갈까?"),
    ).toBeVisible();
    expect(
      screen.queryByText("해뜸이 코스를 준비하고 있어요"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("해뜸", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/요즘 여행지/)).not.toBeInTheDocument();
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

describe("WelcomeDesktopShowcase", () => {
  it("reveals each chat message before moving directly to the CTA slide", async () => {
    const showcaseModule = await loadModule<
      typeof import("@/components/patterns/welcome-desktop-showcase")
    >("@/components/patterns/welcome-desktop-showcase");

    expect(showcaseModule).not.toBeNull();
    if (!showcaseModule) return;

    vi.useFakeTimers();
    stubMatchMedia();

    render(<showcaseModule.WelcomeDesktopShowcase />);

    const conversation = screen.getByRole("list", {
      name: "여행 계획 대화",
    });

    expect(within(conversation).getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.queryByText("해뜸이 코스를 준비하고 있어요"),
    ).not.toBeInTheDocument();

    for (const visibleMessageCount of [2, 3, 4, 5]) {
      act(() => vi.advanceTimersByTime(800));
      expect(within(conversation).getAllByRole("listitem")).toHaveLength(
        visibleMessageCount,
      );
    }

    expect(
      screen.queryByRole("heading", { name: "요즘 뜨는 장소" }),
    ).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(900));
    expect(
      screen.getByText("해뜸이 코스를 준비하고 있어요"),
    ).toBeVisible();

    act(() => vi.advanceTimersByTime(2000));
    expect(
      screen.getByRole("heading", {
        name: "하나의 장소로 주변 맛집, 가볼만한 곳을 하나의 코스로!",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "여행 시작하기" }),
    ).toHaveAttribute("href", "/");

    act(() => vi.advanceTimersByTime(10000));
    expect(
      screen.getByRole("heading", {
        name: "하나의 장소로 주변 맛집, 가볼만한 곳을 하나의 코스로!",
      }),
    ).toBeVisible();

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the final CTA slide immediately when reduced motion is requested", async () => {
    const showcaseModule = await loadModule<
      typeof import("@/components/patterns/welcome-desktop-showcase")
    >("@/components/patterns/welcome-desktop-showcase");

    expect(showcaseModule).not.toBeNull();
    if (!showcaseModule) return;

    stubMatchMedia({ reducedMotion: true });

    render(<showcaseModule.WelcomeDesktopShowcase />);

    expect(
      screen.getByRole("heading", {
        name: "하나의 장소로 주변 맛집, 가볼만한 곳을 하나의 코스로!",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText("해뜸이 코스를 준비하고 있어요"),
    ).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("does not run the desktop sequence below the desktop breakpoint", async () => {
    const showcaseModule = await loadModule<
      typeof import("@/components/patterns/welcome-desktop-showcase")
    >("@/components/patterns/welcome-desktop-showcase");

    expect(showcaseModule).not.toBeNull();
    if (!showcaseModule) return;

    vi.useFakeTimers();
    stubMatchMedia({ desktop: false });

    render(<showcaseModule.WelcomeDesktopShowcase />);
    act(() => vi.advanceTimersByTime(10000));

    expect(
      within(screen.getByRole("list", { name: "여행 계획 대화" }))
        .getAllByRole("listitem"),
    ).toHaveLength(1);
    expect(
      screen.queryByText("해뜸이 코스를 준비하고 있어요"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "요즘 뜨는 장소" }),
    ).not.toBeInTheDocument();
  });

  it("pauses the sequence while the document is hidden", async () => {
    const showcaseModule = await loadModule<
      typeof import("@/components/patterns/welcome-desktop-showcase")
    >("@/components/patterns/welcome-desktop-showcase");

    expect(showcaseModule).not.toBeNull();
    if (!showcaseModule) return;

    const originalVisibility = Object.getOwnPropertyDescriptor(
      document,
      "visibilityState",
    );
    let visibilityState: DocumentVisibilityState = "hidden";

    vi.useFakeTimers();
    stubMatchMedia();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });

    render(<showcaseModule.WelcomeDesktopShowcase />);
    act(() => vi.advanceTimersByTime(10000));
    const conversation = screen.getByRole("list", {
      name: "여행 계획 대화",
    });
    expect(within(conversation).getAllByRole("listitem")).toHaveLength(1);

    visibilityState = "visible";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(800));
    expect(within(conversation).getAllByRole("listitem")).toHaveLength(2);

    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalVisibility) {
      Object.defineProperty(document, "visibilityState", originalVisibility);
    }
  });
});
