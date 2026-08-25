import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MyPage, { metadata } from "@/app/mypage/page";

describe("My Page route", () => {
  it("describes and renders the traveler profile surface", () => {
    expect(metadata).toMatchObject({
      title: "마이페이지 | 해뜸",
      description: "여행 기록과 계정 정보를 확인하세요.",
    });

    render(<MyPage />);

    expect(
      screen.getByRole("heading", { name: "마이페이지", level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
  });
});
