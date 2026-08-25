import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { exploreMock } from "@/features/explore/explore.mock";

describe("ExploreScreen image loading", () => {
  it("eagerly loads the destination images visible in the first viewport", () => {
    render(<ExploreScreen data={exploreMock} region="gyeonggi" />);

    expect(
      screen.getByRole("img", { name: "푸른 바다와 오름이 펼쳐진 제주도" }),
    ).toHaveAttribute("loading", "eager");
    expect(
      screen.getByRole("img", {
        name: "계절 꽃과 정원이 펼쳐진 가평 아침고요수목원",
      }),
    ).toHaveAttribute("loading", "eager");
  });
});
