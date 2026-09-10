import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  headers: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mocks.back,
    replace: mocks.replace,
    push: mocks.push,
  }),
}));

import LoginPage from "@/app/login/page";
import { AuthStoreProvider } from "@/features/auth/auth-store";

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function renderPage(
  searchParams: Parameters<typeof LoginPage>[0]["searchParams"],
) {
  return render(
    <AuthStoreProvider>{await LoginPage({ searchParams })}</AuthStoreProvider>,
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

describe("login page", () => {
  it("builds the Kakao start URL from an approved internal return path", async () => {
    await renderPage(Promise.resolve({ returnTo: "/reviews?source=kakao" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "로그인" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "카카오로 로그인하기" }),
    ).toHaveAttribute(
      "href",
      "http://localhost:4000/api/v1/auth/kakao/start?returnTo=%2Freviews%3Fsource%3Dkakao",
    );
  });

  it("falls back to public home for an unsafe return path", async () => {
    await renderPage(Promise.resolve({ returnTo: "https://evil.example" }));

    expect(
      screen.getByRole("link", { name: "카카오로 로그인하기" }),
    ).toHaveAttribute(
      "href",
      "http://localhost:4000/api/v1/auth/kakao/start?returnTo=%2F",
    );
  });

  it("shows only approved provider errors and keeps the same safe retry URL", async () => {
    await renderPage(
      Promise.resolve({
        error: "provider_unavailable",
        returnTo: "/mypage",
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "카카오 로그인에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
    );
    expect(screen.getByRole("link", { name: "다시 시도하기" })).toHaveAttribute(
      "href",
      "http://localhost:4000/api/v1/auth/kakao/start?returnTo=%2Fmypage",
    );
  });

  it("allows browser back only for a same-host server Referer", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    mocks.headers.mockResolvedValue(
      new Headers({
        Host: "haetteum.test",
        Referer: "https://haetteum.test/reviews?tab=written",
      }),
    );
    await renderPage(Promise.resolve({ returnTo: "/reviews" }));

    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));

    expect(mocks.back).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("does not trust or expose an external Referer even with preexisting history", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(7);
    mocks.headers.mockResolvedValue(
      new Headers({
        Host: "haetteum.test",
        Referer: "https://external.example/private?secret=value",
      }),
    );
    const { container } = await renderPage(
      Promise.resolve({ returnTo: "/mypage" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));

    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(mocks.back).not.toHaveBeenCalled();
    expect(container.innerHTML).not.toContain("external.example");
    expect(container.innerHTML).not.toContain("secret=value");
  });
});
