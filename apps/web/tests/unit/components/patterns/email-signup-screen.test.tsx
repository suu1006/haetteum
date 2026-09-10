import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}));
const signupMocks = vi.hoisted(() => ({
  startEmailSignup: vi.fn(),
  verifyEmailSignupCode: vi.fn(),
}));
const profileMocks = vi.hoisted(() => ({
  uploadProfilePhoto: vi.fn(),
  updateProfilePreferences: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));
vi.mock("@/features/auth/email-signup-client", () => ({
  startEmailSignup: signupMocks.startEmailSignup,
  verifyEmailSignupCode: signupMocks.verifyEmailSignupCode,
}));
vi.mock("@/features/profile/profile-photo-api", () => ({
  uploadProfilePhoto: profileMocks.uploadProfilePhoto,
}));
vi.mock("@/features/profile/profile-preferences-api", () => ({
  updateProfilePreferences: profileMocks.updateProfilePreferences,
}));

import { EmailSignupScreen } from "@/components/patterns/email-signup-screen";
import { AuthStoreProvider, useAuthStore } from "@/features/auth/auth-store";

const kakaoSignupHref =
  "http://localhost:4000/api/v1/auth/kakao/start?returnTo=%2F";
const user = {
  id: "10000000-0000-4000-8000-000000000004",
  displayName: "traveler",
  profileImageUrl: null,
};

function AuthStateProbe() {
  const status = useAuthStore((state) => state.status);
  return <span data-testid="auth-status">{status}</span>;
}

function renderScreen(
  props: Partial<ComponentProps<typeof EmailSignupScreen>> = {},
) {
  return render(
    <AuthStoreProvider>
      <EmailSignupScreen
        canGoBack={false}
        kakaoSignupHref={kakaoSignupHref}
        {...props}
      />
      <AuthStateProbe />
    </AuthStoreProvider>,
  );
}

function fillCredentials(
  email = "traveler@haetteum.kr",
  password = "Password1!",
  confirm = password,
) {
  fireEvent.change(screen.getByPlaceholderText("이메일 주소"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByPlaceholderText("비밀번호 확인"), {
    target: { value: confirm },
  });
}

async function goToVerifyStep() {
  signupMocks.startEmailSignup.mockResolvedValue({
    ok: true,
    data: { codeExpiresAt: new Date(Date.now() + 3 * 60_000).toISOString() },
  });
  const rendered = renderScreen();
  fillCredentials();
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  await screen.findByRole("group", { name: "인증번호 6자리" });
  return rendered;
}

async function goToProfileStep() {
  signupMocks.verifyEmailSignupCode.mockResolvedValue({
    ok: true,
    data: { verified: true, user },
  });
  const rendered = await goToVerifyStep();
  enterCode("123456");
  await screen.findByText("추가 정보를 입력해주세요.");
  return rendered;
}

function enterCode(code: string) {
  const boxes = screen.getAllByLabelText(/인증번호 \d번째 자리/);
  code.split("").forEach((digit, index) => {
    fireEvent.change(boxes[index], { target: { value: digit } });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("EmailSignupScreen", () => {
  it("shows an inline error and does not call the API for a weak or mismatched password", () => {
    renderScreen();

    expect(screen.queryByText("8자 이상, 영문, 숫자, 특수문자를 포함해주세요.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "회원가입" })).toBeVisible();

    fillCredentials("traveler@haetteum.kr", "short", "short");
    expect(screen.queryByText("8자 이상, 영문, 숫자, 특수문자를 포함해주세요.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("alert")).toHaveTextContent("8자 이상");
    expect(signupMocks.startEmailSignup).not.toHaveBeenCalled();

    fillCredentials("traveler@haetteum.kr", "Password1!", "Password2!");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "비밀번호가 일치하지 않아요.",
    );
    expect(signupMocks.startEmailSignup).not.toHaveBeenCalled();
  });

  it("advances to the verification step after starting signup successfully", async () => {
    await goToVerifyStep();

    expect(signupMocks.startEmailSignup).toHaveBeenCalledWith(
      "traveler@haetteum.kr",
      "Password1!",
    );
    expect(screen.getByText("traveler@haetteum.kr")).toBeVisible();
  });

  it("shows the server's error message when starting signup fails", async () => {
    signupMocks.startEmailSignup.mockResolvedValue({
      ok: false,
      message: "이미 가입된 이메일이에요. 로그인을 이용해 주세요.",
    });
    renderScreen();

    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이미 가입된 이메일이에요.",
    );
  });

  it("auto-submits once all six code digits are entered, authenticates, and advances", async () => {
    await goToVerifyStep();
    signupMocks.verifyEmailSignupCode.mockResolvedValue({
      ok: true,
      data: { verified: true, user },
    });

    enterCode("123456");

    await waitFor(() => {
      expect(signupMocks.verifyEmailSignupCode).toHaveBeenCalledWith(
        "traveler@haetteum.kr",
        "123456",
      );
    });
    expect(await screen.findByText("추가 정보를 입력해주세요.")).toBeVisible();
    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated",
      );
    });
  });

  it("shows an error and stays on the verify step for a wrong code", async () => {
    await goToVerifyStep();
    signupMocks.verifyEmailSignupCode.mockResolvedValue({
      ok: false,
      message: "인증번호가 일치하지 않아요.",
    });

    enterCode("000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "인증번호가 일치하지 않아요.",
    );
    expect(screen.getByText("traveler@haetteum.kr")).toBeVisible();
    expect(screen.getByTestId("auth-status")).toHaveTextContent("unknown");
  });

  it("uploads a profile photo immediately and shows the returned URL", async () => {
    await goToProfileStep();
    profileMocks.uploadProfilePhoto.mockResolvedValue({
      status: "success",
      profileImageUrl: "http://localhost:4000/uploads/profile-photos/a.jpg",
    });
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error("file input not found");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(profileMocks.uploadProfilePhoto).toHaveBeenCalledWith(file);
    });
    expect(await screen.findByAltText("")).toHaveAttribute(
      "src",
      "http://localhost:4000/uploads/profile-photos/a.jpg",
    );
  });

  it("saves the selected travel styles and regions, then advances to completion", async () => {
    await goToProfileStep();
    profileMocks.updateProfilePreferences.mockResolvedValue({
      ok: true,
      data: { travelStyles: ["nature_healing"], interestedRegions: ["jeju"] },
    });

    fireEvent.click(screen.getByRole("button", { name: "자연/힐링" }));
    fireEvent.click(screen.getByRole("button", { name: "제주 +" }));
    fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));

    await waitFor(() => {
      expect(profileMocks.updateProfilePreferences).toHaveBeenCalledWith(
        ["nature_healing"],
        ["jeju"],
      );
    });
    expect(
      await screen.findByText("회원가입이 완료되었어요!"),
    ).toBeVisible();
  });

  it("shows an error and stays on the profile step when saving preferences fails", async () => {
    await goToProfileStep();
    profileMocks.updateProfilePreferences.mockResolvedValue({
      ok: false,
      message: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    });

    fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "요청을 처리하지 못했어요.",
    );
    expect(screen.getByText("추가 정보를 입력해주세요.")).toBeVisible();
  });

  it("goes home from the completion screen without any further login call", async () => {
    await goToProfileStep();
    profileMocks.updateProfilePreferences.mockResolvedValue({
      ok: true,
      data: { travelStyles: [], interestedRegions: [] },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
    await screen.findByText("회원가입이 완료되었어요!");

    fireEvent.click(screen.getByRole("button", { name: "로그인하기" }));
    expect(routerMocks.push).toHaveBeenCalledWith("/");

    fireEvent.click(screen.getByRole("button", { name: "홈으로 가기" }));
    expect(routerMocks.push).toHaveBeenCalledWith("/");
  });

  it("moves back a step instead of leaving the flow from the verify step", async () => {
    await goToVerifyStep();

    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(screen.getByPlaceholderText("이메일 주소")).toBeVisible();
    expect(routerMocks.back).not.toHaveBeenCalled();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("exits the flow from the credentials step", () => {
    renderScreen({ canGoBack: true });

    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(routerMocks.back).toHaveBeenCalledOnce();
  });

  it("offers a kakao signup shortcut on the credentials step", () => {
    renderScreen();

    expect(
      screen.getByRole("link", { name: "카카오로 가입하기" }),
    ).toHaveAttribute("href", kakaoSignupHref);
  });

  it("has no detectable accessibility violations on the credentials step", async () => {
    const { container } = renderScreen();

    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });

  it("has no detectable accessibility violations on the verify step", async () => {
    const { container } = await goToVerifyStep();

    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });

  it("has no detectable accessibility violations on the profile step", async () => {
    const { container } = await goToProfileStep();

    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});
