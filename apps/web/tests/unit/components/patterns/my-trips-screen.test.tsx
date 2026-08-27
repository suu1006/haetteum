import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MyTripsScreen } from "@/components/patterns/my-trips-screen";

const testTrips = {
  scheduled: [
    {
      id: "jeju-healing",
      dDay: "D-5",
      title: "제주도 힐링 여행",
      duration: "2박 3일",
      dateRange: "2025.08.28 ~ 08.30",
      imageSrc: "/images/trips/jeju-healing.png",
      imageAlt: "숲과 바다가 내려다보이는 제주 여행지",
      participantCount: 4,
      participants: [
        { id: "mina", name: "민아", imageSrc: "/images/trips/avatar-mina.png" },
        { id: "jun", name: "준호", imageSrc: "/images/trips/avatar-jun.png" },
        { id: "seo", name: "서연", imageSrc: "/images/trips/avatar-seo.png" },
      ],
    },
    {
      id: "busan-sea",
      dDay: "D-12",
      title: "부산 바다 여행",
      duration: "1박 2일",
      dateRange: "2025.09.04 ~ 09.05",
      imageSrc: "/images/trips/busan-sea.png",
      imageAlt: "푸른 바다와 마을이 보이는 부산 여행지",
      participantCount: 3,
      participants: [
        { id: "jun", name: "준호", imageSrc: "/images/trips/avatar-jun.png" },
        { id: "seo", name: "서연", imageSrc: "/images/trips/avatar-seo.png" },
      ],
    },
    {
      id: "gyeongju-history",
      dDay: "D-20",
      title: "경주 역사 탐방",
      duration: "1박 2일",
      dateRange: "2025.09.12 ~ 09.13",
      imageSrc: "/images/trips/gyeongju-history.png",
      imageAlt: "전통 누각이 보이는 경주 여행지",
      participantCount: 2,
      participants: [
        { id: "mina", name: "민아", imageSrc: "/images/trips/avatar-mina.png" },
        { id: "seo", name: "서연", imageSrc: "/images/trips/avatar-seo.png" },
      ],
    },
  ],
  past: [
    {
      id: "jeonju-food",
      dDay: "완료",
      title: "전주 미식 여행",
      duration: "1박 2일",
      dateRange: "2025.07.12 ~ 07.13",
      imageSrc: "/images/trips/gyeongju-history.png",
      imageAlt: "한옥 풍경이 있는 전주 여행지",
      participantCount: 2,
      participants: [
        { id: "mina", name: "민아", imageSrc: "/images/trips/avatar-mina.png" },
      ],
    },
  ],
};

describe("MyTripsScreen", () => {
  it("keeps every primary content region on the standard horizontal inset", () => {
    render(<MyTripsScreen trips={testTrips} />);

    const header = screen
      .getByRole("heading", { level: 1, name: "내 일정" })
      .closest("header");
    const tabsContainer = screen
      .getByRole("tablist", { name: "일정 구분" })
      .parentElement;
    const panel = screen.getByRole("tabpanel");
    const actionsContainer = screen
      .getByRole("button", { name: "새 일정 만들기" })
      .parentElement;

    for (const region of [header, tabsContainer, panel, actionsContainer]) {
      expect(region).toHaveClass("px-5");
    }
  });

  it("aligns the header top inset with the Explore screen", () => {
    render(<MyTripsScreen trips={testTrips} />);

    const header = screen
      .getByRole("heading", { level: 1, name: "내 일정" })
      .closest("header");

    expect(header).toHaveClass("pt-[25px]");
  });

  it("renders upcoming trip cards and marks the trip navigation current", () => {
    render(<MyTripsScreen trips={testTrips} />);

    expect(screen.getByRole("heading", { level: 1, name: "내 일정" })).toBeVisible();
    expect(screen.getByRole("button", { name: "알림" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "예정된 일정" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const list = screen.getByRole("list", { name: "예정된 일정 목록" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const jejuCard = within(list).getByRole("article", {
      name: "D-5 제주도 힐링 여행",
    });
    expect(
      within(jejuCard).getByRole("img", {
        name: "숲과 바다가 내려다보이는 제주 여행지",
      }),
    ).toHaveAttribute("loading", "eager");
    expect(
      within(list).getByRole("img", {
        name: "전통 누각이 보이는 경주 여행지",
      }),
    ).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("img", { name: "AI 여행 일정 도우미" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(jejuCard).toHaveTextContent("2박 3일 · 2025.08.28 ~ 08.30");
    expect(jejuCard).toHaveTextContent("4명");
    expect(within(jejuCard).getAllByRole("img")).toHaveLength(4);

    expect(screen.getByRole("link", { name: "내 일정" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
  });

  it("switches to past trips without leaving the screen", async () => {
    const user = userEvent.setup();
    render(<MyTripsScreen trips={testTrips} />);

    await user.click(screen.getByRole("tab", { name: "지난 일정" }));

    expect(screen.getByRole("tab", { name: "지난 일정" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("list", { name: "지난 일정 목록" })).toHaveTextContent(
      "전주 미식 여행",
    );
    expect(screen.queryByText("제주도 힐링 여행")).not.toBeInTheDocument();
  });

  it("gives feedback for the visible itinerary actions", async () => {
    const user = userEvent.setup();
    render(<MyTripsScreen trips={testTrips} />);

    await user.click(
      screen.getByRole("button", { name: "제주도 힐링 여행 상세 보기" }),
    );
    expect(screen.getByRole("status", { name: "일정 화면 상태" })).toHaveTextContent(
      "제주도 힐링 여행 상세 화면을 준비하고 있어요.",
    );

    await user.click(screen.getByRole("button", { name: "AI 맞춤 일정 추천 받기" }));
    expect(screen.getByRole("status", { name: "일정 화면 상태" })).toHaveTextContent(
      "AI 맞춤 일정 추천을 준비하고 있어요.",
    );

    await user.click(screen.getByRole("button", { name: "새 일정 만들기" }));
    expect(screen.getByRole("status", { name: "일정 화면 상태" })).toHaveTextContent(
      "새 일정 만들기를 준비하고 있어요.",
    );
  });
});
