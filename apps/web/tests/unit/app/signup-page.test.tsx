import { render, screen } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

import SignupPage from "@/app/signup/page";
import { AuthStoreProvider } from "@/features/auth/auth-store";

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function renderPage() {
  return render(
    <AuthStoreProvider>{await SignupPage()}</AuthStoreProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
  mocks.headers.mockResolvedValue(new Headers({ Host: "haetteum.test" }));
});

afterAll(() => {
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    return;
  }
  process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
});

describe("signup page", () => {
  it("renders the email signup credentials step with a kakao shortcut to the same start endpoint as login", async () => {
    await renderPage();

    expect(screen.getByPlaceholderText("이메일 주소")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "카카오로 가입하기" }),
    ).toHaveAttribute(
      "href",
      "http://localhost:4000/api/v1/auth/kakao/start?returnTo=%2F",
    );
  });
});
