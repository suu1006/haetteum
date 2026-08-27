import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

import { LoginScreen } from "@/components/patterns/login-screen";

const loginHref =
  "http://localhost:4000/api/v1/auth/kakao/start?returnTo=%2Freviews";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("LoginScreen", () => {
  it("renders the approved minimal login content without invented legal links", () => {
    render(<LoginScreen canGoBack={false} loginHref={loginHref} />);

    expect(screen.getByText("해뜸")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "여행 기록을 이어서 관리해보세요",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "카카오 계정의 식별자, 닉네임과 프로필 이미지만 사용합니다.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("로그인 후 내 후기로 돌아가요")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /약관|개인정보처리방침/ })).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: "카카오로 계속하기" })).toHaveAttribute(
      "href",
      loginHref,
    );
  });

  it("marks the ON-toggle brand track as decorative while keeping visible brand text", () => {
    const { container } = render(
      <LoginScreen canGoBack={false} loginHref={loginHref} />,
    );

    const mark = container.querySelector('[data-testid="brand-toggle-mark"]');
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark).toHaveClass("rounded-full", "bg-primary");
    expect(mark?.firstElementChild).toHaveClass("right-1", "rounded-full", "bg-white");
    expect(screen.getByText("해뜸")).toBeVisible();
  });

  it("uses a full mobile surface and a centered desktop card", () => {
    render(<LoginScreen canGoBack={false} loginHref={loginHref} />);

    expect(screen.getByTestId("login-surface")).toHaveClass(
      "min-h-svh",
      "md:grid",
      "md:place-items-center",
    );
    expect(screen.getByTestId("login-card")).toHaveClass(
      "min-h-svh",
      "md:min-h-[33.125rem]",
      "md:max-w-[26.875rem]",
    );
  });

  it("uses router history only when the server verified an internal predecessor", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    render(<LoginScreen canGoBack loginHref={loginHref} />);

    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));

    expect(routerMocks.back).toHaveBeenCalledOnce();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("falls back to home for a direct load even when unrelated history exists", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(8);
    render(<LoginScreen canGoBack={false} loginHref={loginHref} />);

    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));

    expect(routerMocks.replace).toHaveBeenCalledWith("/");
    expect(routerMocks.back).not.toHaveBeenCalled();
  });

  it("renders the approved error and retry action only when an error exists", () => {
    const { rerender } = render(
      <LoginScreen canGoBack={false} loginHref={loginHref} />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <LoginScreen
        canGoBack={false}
        errorMessage="카카오 로그인이 취소되었어요. 다시 시도해 주세요."
        loginHref={loginHref}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "카카오 로그인이 취소되었어요. 다시 시도해 주세요.",
    );
    expect(screen.getByRole("link", { name: "다시 시도하기" })).toHaveAttribute(
      "href",
      loginHref,
    );
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <LoginScreen canGoBack={false} loginHref={loginHref} />,
    );

    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});
