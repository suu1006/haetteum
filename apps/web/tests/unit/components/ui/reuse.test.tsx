import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { TripScheduleTabs } from "@/components/domain/course/trip-schedule-tabs";
import { AuthPrimaryButton } from "@/features/auth/components/auth-primary-button";
it("moves selection and focus through schedule tabs with arrow keys", () => {
  function Example() {
    const [tab, setTab] = useState<"scheduled" | "past">("scheduled");
    return <TripScheduleTabs activeTab={tab} onChange={setTab} />;
  }
  render(<Example />);
  const first = screen.getByRole("tab", { name: "예정된 일정" });
  first.focus();
  fireEvent.keyDown(first, { key: "ArrowRight" });
  const last = screen.getByRole("tab", { name: "지난 일정" });
  expect(last).toHaveFocus();
  expect(last).toHaveAttribute("aria-selected", "true");
  expect(first).toHaveAttribute("tabindex", "-1");
  fireEvent.keyDown(last, { key: "Home" });
  expect(first).toHaveFocus();
});
it("prevents submission while an auth action is loading even with disabled=false", () => {
  render(
    <AuthPrimaryButton loading disabled={false} loadingLabel="저장 중">
      저장
    </AuthPrimaryButton>,
  );
  expect(screen.getByRole("button", { name: "저장 중" })).toBeDisabled();
});
