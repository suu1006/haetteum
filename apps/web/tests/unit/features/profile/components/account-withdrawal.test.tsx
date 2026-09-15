import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthStoreProvider, useAuthStore } from "@/features/auth/auth-store";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";
import { MyPageMenuList } from "@/features/profile/components/my-page-menu-list";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
function State() {
  const status = useAuthStore((state) => state.status);
  return <output data-testid="status">{status}</output>;
}
function setup() {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["private-data"], { email: "private@example.test" });
  render(
    <QueryClientProvider client={client}>
      <AuthStoreProvider>
        <AuthUserHydrator
          user={{
            id: "10000000-0000-4000-8000-000000000001",
            displayName: "회원",
            profileImageUrl: null,
            provider: "EMAIL",
          }}
        />
        <MyPageMenuList
          items={[
            { id: "logout", label: "로그아웃" },
            { id: "withdraw", label: "회원탈퇴" },
          ]}
        />
        <State />
      </AuthStoreProvider>
    </QueryClientProvider>,
  );
  return client;
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("account withdrawal confirmation", () => {
  it("requires confirmation and allows cancellation without deleting the account", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "회원탈퇴" }));
    const modal = screen.getByRole("dialog", { name: "탈퇴하시겠습니까?" });
    expect(modal).toHaveTextContent(
      "회원 탈퇴 시 모든 개인정보가 삭제됩니다. 정말로 탈퇴하시겠어요?",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(within(modal).getByRole("button", { name: "취소" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears personal client data only after the server confirms deletion", async () => {
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "회원탈퇴" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "회원탈퇴",
      }),
    );
    expect(
      screen.getByRole("button", { name: "탈퇴 처리 중…" }),
    ).toBeDisabled();
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/account"),
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
        body: '{"confirmed":true}',
      }),
    );
    finish(new Response(null, { status: 204 }));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous"),
    );
    expect(client.getQueryData(["private-data"])).toBeUndefined();
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("keeps the account signed in and offers retry when deletion fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 500 })),
    );
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "회원탈퇴" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "회원탈퇴",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "회원탈퇴를 완료하지 못했어요",
    );
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "회원탈퇴",
      }),
    ).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
