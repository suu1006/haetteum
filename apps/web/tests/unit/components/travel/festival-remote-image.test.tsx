import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FestivalRemoteImage } from "@/components/travel/festival-remote-image";

describe("FestivalRemoteImage", () => {
  it("renders an approved provider image", () => {
    render(
      <FestivalRemoteImage
        src="https://tong.visitkorea.or.kr/test.jpg"
        alt="실데이터 축제 대표 이미지"
        sizes="200px"
      />,
    );

    expect(
      screen.getByRole("img", { name: "실데이터 축제 대표 이미지" }),
    ).toHaveAttribute("src", expect.stringContaining("test.jpg"));
  });

  it("renders the neutral placeholder for a missing or failed image", () => {
    const { rerender } = render(
      <FestivalRemoteImage
        src={null}
        alt="이미지 없는 축제 대표 이미지"
        sizes="200px"
      />,
    );
    expect(
      screen.getByRole("img", { name: "이미지 없는 축제 대표 이미지" }),
    ).toHaveAttribute("data-image-state", "placeholder");

    rerender(
      <FestivalRemoteImage
        src="https://tong.visitkorea.or.kr/failure.jpg"
        alt="실패한 축제 대표 이미지"
        sizes="200px"
      />,
    );
    fireEvent.error(
      screen.getByRole("img", { name: "실패한 축제 대표 이미지" }),
    );
    expect(
      screen.getByRole("img", { name: "실패한 축제 대표 이미지" }),
    ).toHaveAttribute("data-image-state", "placeholder");
  });
});
