import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

describe("Badge", () => {
  it("renders the shadcn badge with the selected variant", () => {
    render(<Badge variant="secondary">지금 인기 급상승</Badge>);

    expect(screen.getByText("지금 인기 급상승")).toHaveAttribute(
      "data-slot",
      "badge",
    );
  });

  it("exposes status text through the shadcn badge surface", () => {
    render(<Badge>진행 중</Badge>);

    expect(screen.getByText("진행 중")).toHaveAttribute("data-slot", "badge");
  });
});

describe("Button", () => {
  it("uses the 44px mobile control as its default size", () => {
    render(<Button>코스 보기</Button>);

    expect(screen.getByRole("button", { name: "코스 보기" })).toHaveClass(
      "h-11",
    );
  });

  it("provides the 52px primary action size", () => {
    render(<Button size="lg">코스 수정하기</Button>);

    expect(
      screen.getByRole("button", { name: "코스 수정하기" }),
    ).toHaveClass("h-13");
  });

  it("keeps disabled actions natively unavailable", () => {
    render(<Button disabled>저장하기</Button>);

    expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
  });
});

describe("Input", () => {
  it("keeps search input at the 44px mobile control height", () => {
    render(<Input aria-label="여행지 검색" type="search" />);

    expect(screen.getByRole("searchbox", { name: "여행지 검색" })).toHaveClass(
      "h-11",
    );
  });
});

describe("Toggle", () => {
  it("exposes its pressed state and changes it on activation", async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="즐겨찾기">저장</Toggle>);

    const toggle = screen.getByRole("button", { name: "즐겨찾기" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ToggleGroup", () => {
  it("allows one region filter to be selected", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup aria-label="지역 선택" type="single">
        <ToggleGroupItem value="seoul">서울</ToggleGroupItem>
        <ToggleGroupItem value="busan">부산</ToggleGroupItem>
      </ToggleGroup>,
    );

    await user.click(screen.getByRole("button", { name: "서울" }));

    expect(screen.getByRole("button", { name: "서울" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "부산" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps multiple filters pressed when configured for multiple selection", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup aria-label="후기 출처" type="multiple">
        <ToggleGroupItem value="kakao">카카오</ToggleGroupItem>
        <ToggleGroupItem value="google">구글</ToggleGroupItem>
      </ToggleGroup>,
    );

    await user.click(screen.getByRole("button", { name: "카카오" }));
    await user.click(screen.getByRole("button", { name: "구글" }));

    expect(screen.getByRole("button", { name: "카카오" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "구글" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("Card", () => {
  it("keeps title and content as semantic card parts", () => {
    render(
      <Card>
        <CardTitle>성산일출봉</CardTitle>
        <CardContent>제주 동부의 대표 여행지</CardContent>
      </Card>,
    );

    expect(screen.getByText("성산일출봉")).toHaveAttribute(
      "data-slot",
      "card-title",
    );
    expect(screen.getByText("제주 동부의 대표 여행지")).toHaveAttribute(
      "data-slot",
      "card-content",
    );
  });
});
