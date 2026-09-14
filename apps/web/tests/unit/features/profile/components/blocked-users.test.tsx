import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { BlockedUsers } from "@/features/profile/components/blocked-users";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("removes an unblocked user and shows the empty state", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example/api/v1");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  render(
    <BlockedUsers
      items={[
        {
          userId: "11111111-1111-4111-8111-111111111111",
          displayName: "여행자",
          createdAt: "2026-09-14T00:00:00Z",
        },
      ]}
    />,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "여행자 차단 해제" }),
  );
  expect(
    await screen.findByText("차단한 사용자가 없어요."),
  ).toBeInTheDocument();
});
it("preserves the block if the request fails", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example/api/v1");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
  );
  render(
    <BlockedUsers
      items={[
        {
          userId: "11111111-1111-4111-8111-111111111111",
          displayName: "여행자",
          createdAt: "2026-09-14T00:00:00Z",
        },
      ]}
    />,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "여행자 차단 해제" }),
  );
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByText("여행자")).toBeInTheDocument();
});
