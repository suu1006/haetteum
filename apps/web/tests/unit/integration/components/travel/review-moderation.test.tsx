import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LivePlaceReviewList } from "@/components/domain/review/live-place-review-list";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const reviews = {
  placeId: "11111111-1111-4111-8111-111111111111",
  reviewCount: 1,
  averageRating: 5,
  ratingDistribution: [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: score === 5 ? 1 : 0,
  })),
  items: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      rating: 5,
      content: "즐거운 여행 후기입니다",
      author: { displayName: "여행자", profileImageUrl: null },
      createdAt: "2026-09-14T00:00:00Z",
      updatedAt: "2026-09-14T00:00:00Z",
      moderation: "available",
    },
  ],
} as const;
function fixture() {
  return structuredClone(reviews) as unknown as Parameters<
    typeof LivePlaceReviewList
  >[0]["reviews"];
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("review moderation", () => {
  it("submits a report and shows receipt without removing the review", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example/api/v1");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    render(<LivePlaceReviewList reviews={fixture()} />);
    screen.getByRole("button", { name: "후기 메뉴" }).focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "신고하기" }));
    await user.selectOptions(screen.getByLabelText("신고 사유"), "SPAM");
    await user.type(screen.getByLabelText("상세 내용 (선택)"), "광고입니다");
    await user.click(screen.getByRole("button", { name: "신고 접수" }));
    expect(await screen.findByText("신고가 접수되었어요.")).toBeInTheDocument();
    expect(screen.getByText("즐거운 여행 후기입니다")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/reports"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ reason: "SPAM", details: "광고입니다" }),
      }),
    );
  });
  it("requires confirmation and only hides the review after a successful block", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example/api/v1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    const user = userEvent.setup();
    render(<LivePlaceReviewList reviews={fixture()} />);
    screen.getByRole("button", { name: "후기 메뉴" }).focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "작성자 차단" }));
    expect(screen.getByText("즐거운 여행 후기입니다")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "차단하기" }));
    await waitFor(() =>
      expect(
        screen.queryByText("즐거운 여행 후기입니다"),
      ).not.toBeInTheDocument(),
    );
    expect(refresh).toHaveBeenCalled();
  });
  it("keeps the review visible when blocking fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example/api/v1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const user = userEvent.setup();
    render(<LivePlaceReviewList reviews={fixture()} />);
    screen.getByRole("button", { name: "후기 메뉴" }).focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "작성자 차단" }));
    await user.click(screen.getByRole("button", { name: "차단하기" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("즐거운 여행 후기입니다")).toBeInTheDocument();
  });
});

it("offers a login path for anonymous visitors and no actions on own reviews", async () => {
  const anonymous = fixture();
  anonymous.items[0].moderation = "login-required";
  const { unmount } = render(<LivePlaceReviewList reviews={anonymous} />);
  screen.getByRole("button", { name: "후기 메뉴" }).focus();
  await userEvent.keyboard("{Enter}");
  expect(await screen.findByRole("menuitem", { name: "로그인 후 신고·차단하기" })).toHaveAttribute("href", expect.stringContaining("/login?returnTo="));
  expect(screen.queryByRole("menuitem", { name: "신고하기" })).not.toBeInTheDocument();
  unmount();
  const own = fixture();
  own.items[0].moderation = "own";
  render(<LivePlaceReviewList reviews={own} />);
  expect(screen.queryByRole("button", { name: "후기 메뉴" })).not.toBeInTheDocument();
});


it("shows attached photos and opens the selected photo at full size", async () => {
  const data = fixture();
  Object.assign(data.items[0], { images: ["https://example.test/one.jpg", "https://example.test/two.jpg"] });
  const user = userEvent.setup();
  render(<LivePlaceReviewList reviews={data} />);
  const thumbnail = screen.getByRole("button", { name: "여행자의 후기 사진 2 크게 보기" });
  await user.click(thumbnail);
  const dialog = await screen.findByRole("dialog");
  expect(dialog.querySelector("img")).toHaveAttribute("src", "https://example.test/two.jpg");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
