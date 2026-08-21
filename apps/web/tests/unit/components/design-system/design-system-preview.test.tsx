import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

async function loadPreview() {
  const modulePath = "@/components/design-system/design-system-preview";

  return import(/* @vite-ignore */ modulePath).catch(() => null);
}

describe("DesignSystemPreview", () => {
  it("presents every Foundation group with a clear document hierarchy", async () => {
    const previewModule = await loadPreview();

    expect(previewModule).not.toBeNull();
    if (!previewModule) return;

    render(<previewModule.DesignSystemPreview />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Haetteum 디자인 시스템",
      }),
    ).toBeInTheDocument();

    for (const name of [
      "색상",
      "타이포그래피",
      "버튼",
      "선택 컨트롤",
      "검색 입력",
      "카드",
      "여행 콘텐츠",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }

    expect(
      screen.getByRole("article", { name: "성산일출봉" }),
    ).toBeInTheDocument();
    expect(screen.getByText("여행자 민지")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "제주 하루 일정" }),
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const previewModule = await loadPreview();

    expect(previewModule).not.toBeNull();
    if (!previewModule) return;

    const { container } = render(<previewModule.DesignSystemPreview />);
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
