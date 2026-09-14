import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "@/components/patterns/empty-state/empty-state";
import { SearchBar } from "@/components/patterns/search-bar/search-bar";
import { Toast } from "@/components/ui/toast/toast";

describe("shared presentation patterns", () => {
  it("keeps the caller's empty copy and recovery action", () => {
    render(<EmptyState title="결과 없음" description="다른 검색어를 입력하세요" action={<a href="/explore">다시 검색</a>} />);
    expect(screen.getByText("결과 없음")).toBeVisible();
    expect(screen.getByRole("link", { name: "다시 검색" })).toHaveAttribute("href", "/explore");
  });
  it("submits the search term and caller-supplied filters", () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(<SearchBar id="query" label="여행지 검색" action="/explore" defaultValue="서울" onSubmit={submit}><input type="hidden" name="region" value="seoul" /></SearchBar>);
    const form = screen.getByRole("search") as HTMLFormElement;
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "부산" } });
    expect(new FormData(form).get("q")).toBe("부산");
    expect(new FormData(form).get("region")).toBe("seoul");
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(submit).toHaveBeenCalledOnce();
  });
  it("announces caller-owned messages without owning delivery state", () => {
    const view = render(<Toast>저장 완료</Toast>);
    expect(screen.getByRole("status")).toHaveTextContent("저장 완료");
    view.rerender(<Toast>복사 완료</Toast>);
    expect(screen.getByRole("status")).toHaveTextContent("복사 완료");
  });
});
