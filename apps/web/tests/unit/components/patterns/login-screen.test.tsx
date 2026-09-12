import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({
  loginWithEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));
vi.mock("@/features/auth/auth-client", () => ({
  loginWithEmail: authMocks.loginWithEmail,
}));

import { LoginScreen } from "@/components/patterns/login-screen";
import { AuthStoreProvider, useAuthStore } from "@/features/auth/auth-store";

const loginHref =
  "http://localhost:4000/api/v1/auth/kakao/start?returnTo=%2Freviews";
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  displayName: "traveler",
  profileImageUrl: null,
};

function AuthStateProbe() {
  const status = useAuthStore((state) => state.status);
  return <span data-testid="auth-status">{status}</span>;
}

function renderScreen(props: Partial<ComponentProps<typeof LoginScreen>> = {}) {
  return render(
    <AuthStoreProvider>
      <LoginScreen loginHref={loginHref} {...props} />
      <AuthStateProbe />
    </AuthStoreProvider>,
  );
}

async function fillCredentials(email: string, password: string) {
  fireEvent.change(screen.getByPlaceholderText("이메일 주소 또는 아이디"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
    target: { value: password },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("LoginScreen", () => {
  it("renders the email/password form alongside the kakao action", () => {
    renderScreen();

    expect(screen.getByRole("img", { name: "해뜸" })).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 1, name: "로그인" }),
    ).toBeVisible();

    expect(
      screen.getByPlaceholderText("이메일 주소 또는 아이디"),
    ).toBeVisible();
    expect(screen.getByPlaceholderText("비밀번호")).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "로그인 상태 유지" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "비밀번호를 잊으셨나요?" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "로그인" })).toBeVisible();

    expect(
      screen.getByRole("link", { name: "카카오로 로그인하기" }),
    ).toHaveAttribute("href", loginHref);
    expect(
      screen.queryByRole("button", { name: "구글로 로그인하기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "회원가입하기" }),
    ).toBeVisible();
  });

  it("toggles password visibility", () => {
    renderScreen();

    const passwordInput = screen.getByPlaceholderText("비밀번호");
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 표시" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 숨기기" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("logs in with email/password, authenticates the store, and redirects to returnTo", async () => {
    authMocks.loginWithEmail.mockResolvedValue({ ok: true, user });
    renderScreen({ returnTo: "/reviews?tab=written" });

    await fillCredentials("traveler@haetteum.kr", "Password1!");
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(authMocks.loginWithEmail).toHaveBeenCalledWith(
        "traveler@haetteum.kr",
        "Password1!",
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated",
      );
    });
    expect(routerMocks.push).toHaveBeenCalledWith("/reviews?tab=written");
  });

  it("shows the server error message and does not authenticate on failed login", async () => {
    authMocks.loginWithEmail.mockResolvedValue({
      ok: false,
      message: "이메일 또는 비밀번호가 올바르지 않아요.",
    });
    renderScreen();

    await fillCredentials("traveler@haetteum.kr", "wrong-password");
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("이메일 또는 비밀번호가 올바르지 않아요.");
    expect(screen.getByTestId("auth-status")).toHaveTextContent("unknown");
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("shows a coming-soon notice for forgot password", () => {
    renderScreen();

    fireEvent.click(
      screen.getByRole("button", { name: "비밀번호를 잊으셨나요?" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "비밀번호 재설정은 아직 준비 중이에요",
    );
  });

  it("navigates to the signup flow from the footer", () => {
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: "회원가입하기" }));
    expect(routerMocks.push).toHaveBeenCalledWith("/signup");
  });

  it("links the supplied brand logo to home without the old header actions", () => {
    renderScreen();
    const homeLink = screen.getByRole("link", { name: "해뜸 메인페이지로 이동" });
    expect(homeLink).toHaveAttribute("href", "/");
    expect(screen.getByRole("img", { name: "해뜸" })).toHaveAttribute("src", "/images/login_logo.svg");
    expect(screen.queryByRole("button", { name: "뒤로가기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "회원가입" })).not.toBeInTheDocument();
  });

  it("renders the approved error and retry action only when an error exists", () => {
    const { rerender } = render(
      <AuthStoreProvider>
        <LoginScreen loginHref={loginHref} />
      </AuthStoreProvider>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <AuthStoreProvider>
        <LoginScreen
          errorMessage="카카오 로그인이 취소되었어요. 다시 시도해 주세요."
          loginHref={loginHref}
        />
      </AuthStoreProvider>,
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
    const { container } = renderScreen();

    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});
