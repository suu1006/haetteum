import type { PlaceListItem } from "@haetteum/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render as rtlRender,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CourseEditor } from "@/features/courses/course-editor";
import type { CourseEditFixture } from "@/features/courses/course-edit-model";
import { courseEditMock } from "@/features/courses/course-edit.mock";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

const searchablePlaces = vi.hoisted(
  () =>
    [
      {
        id: "icheon-city-museum",
        title: "이천 시립박물관",
        region: "seoul",
        district: "종로구",
        address: null,
        longitude: 0,
        latitude: 0,
        primaryImageUrl: null,
        imageCopyrightType: null,
      },
      {
        id: "cafe-oncheon",
        title: "카페 온천",
        region: "seoul",
        district: "종로구",
        address: null,
        longitude: 0,
        latitude: 0,
        primaryImageUrl: null,
        imageCopyrightType: null,
      },
      {
        id: "termeden-resort",
        title: "테르메덴 리조트",
        region: "seoul",
        district: "종로구",
        address: null,
        longitude: 0,
        latitude: 0,
        primaryImageUrl: null,
        imageCopyrightType: null,
      },
    ] as const satisfies readonly PlaceListItem[],
);

vi.mock("@/features/places/place-search-api", () => ({
  searchPlaces: vi.fn().mockResolvedValue({
    status: "ready",
    items: searchablePlaces,
  }),
}));

const nearbyMocks = vi.hoisted(() => ({ loadNearbyPlaces: vi.fn() }));
vi.mock("@/features/places/place-detail-api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/places/place-detail-api")>(),
  loadNearbyPlaces: nearbyMocks.loadNearbyPlaces,
}));

const savedCourseApiMocks = vi.hoisted(() => ({
  saveCourse: vi.fn(),
  updateSavedCourse: vi.fn(),
  loadMySavedCourses: vi.fn(),
  removeSavedCourse: vi.fn(),
}));

vi.mock("@/features/trips/saved-course-api", () => savedCourseApiMocks);

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("CourseEditor", () => {
  beforeEach(() => {
    nearbyMocks.loadNearbyPlaces.mockReset();
    routerMocks.back.mockReset();
    routerMocks.push.mockReset();
    savedCourseApiMocks.saveCourse.mockReset();
    savedCourseApiMocks.updateSavedCourse.mockReset();
    savedCourseApiMocks.loadMySavedCourses.mockReset();
    savedCourseApiMocks.removeSavedCourse.mockReset();
    savedCourseApiMocks.loadMySavedCourses.mockResolvedValue({ items: [] });
  });

  it("previews an alternative without changing the draft until applied", async () => {
    const user = userEvent.setup();
    const base = courseEditMock.courses.ai.places[0]!;
    const places = [0, 3, 1, 2].map((offset, index) => ({
      ...base, id: String(index), title: `장소 ${index}`,
      latitude: 37, longitude: 127 + offset / 100,
    }));
    const course = { ...courseEditMock, courses: { ...courseEditMock.courses,
      ai: { ...courseEditMock.courses.ai, places, slots: courseEditMock.courses.ai.slots.slice(0, 4) },
    }};
    render(<CourseEditor course={course} />);
    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    await user.click(screen.getByRole("button", { name: "다른 코스 추천받기" }));
    await user.click(screen.getByRole("button", { name: /기존 장소 유지/ }));
    expect(await screen.findByRole("button", { name: "이 코스로 변경" })).toBeEnabled();
    expect(within(itinerary).getAllByRole("listitem", { hidden: true })[1]).toHaveTextContent("장소 1");
    await user.click(screen.getByRole("button", { name: "기존 코스 유지" }));
    expect(within(itinerary).getAllByRole("listitem", { hidden: true })[1]).toHaveTextContent("장소 1");
    await user.click(screen.getByRole("button", { name: "다른 코스 추천받기" }));
    await user.click(screen.getByRole("button", { name: /기존 장소 유지/ }));
    await user.click(await screen.findByRole("button", { name: "이 코스로 변경" }));
    expect(within(itinerary).getAllByRole("listitem", { hidden: true })[1]).toHaveTextContent("장소 2");
    expect(within(itinerary).getByText("08:30")).toBeVisible();
  });

  it("applies new nearby places only after confirmation and keeps time slots", async () => {
    const user = userEvent.setup();
    nearbyMocks.loadNearbyPlaces.mockResolvedValue({
      status: "ready", category: "cafe", partial: false,
      items: [{ provider: "KAKAO_LOCAL", providerPlaceId: "987", title: "새로운 카페",
        categoryLabel: "카페", telephone: null, address: "서울", roadAddress: null,
        longitude: 127, latitude: 37, distanceMeters: 100, placeUrl: "https://place.map.kakao.com/987" }],
    });
    const course = { ...courseEditMock, courses: { ...courseEditMock.courses,
      ai: { ...courseEditMock.courses.ai, places: courseEditMock.courses.ai.places.map((p, i) =>
        i === 0 ? { ...p, id: "20000000-0000-4000-8000-000000000001" } : p) },
    }};
    render(<CourseEditor course={course} />);
    await user.click(screen.getByRole("button", { name: "다른 코스 추천받기" }));
    await user.click(screen.getByRole("button", { name: /새 장소 포함/ }));
    expect(await screen.findByText("새로운 카페")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "기존 코스 유지" }));
    await user.click(screen.getByRole("button", { name: "다른 코스 추천받기" }));
    await user.click(screen.getByRole("button", { name: /새 장소 포함/ }));
    expect(await screen.findByText("새로운 카페")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "이 코스로 변경" }));
    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(itinerary).getByText("새로운 카페")).toBeVisible();
    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(5);
    expect(within(itinerary).getByText("08:30")).toBeVisible();
    expect(savedCourseApiMocks.updateSavedCourse).not.toHaveBeenCalled();
  });

  it("ignores a recommendation response after closing and reopening", async () => {
    const user = userEvent.setup();
    let finish!: (value: { status: "unavailable"; reason: "provider_unavailable" }) => void;
    nearbyMocks.loadNearbyPlaces.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const course = { ...courseEditMock, courses: { ...courseEditMock.courses,
      ai: { ...courseEditMock.courses.ai, places: courseEditMock.courses.ai.places.map((p, i) =>
        i === 0 ? { ...p, id: "20000000-0000-4000-8000-000000000001" } : p) },
    }};
    render(<CourseEditor course={course} />);
    await user.click(screen.getByRole("button", { name: "다른 코스 추천받기" }));
    await user.click(screen.getByRole("button", { name: /새 장소 포함/ }));
    expect(screen.getByText("다른 코스를 찾고 있어요…")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "기존 코스 유지" }));
    await user.click(screen.getByRole("button", { name: "다른 코스 추천받기" }));
    finish({ status: "unavailable", reason: "provider_unavailable" });
    await user.click(screen.getByRole("button", { name: /기존 장소 유지/ }));
    expect(screen.queryByText("주변 장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "기존 코스 유지" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("keeps the draft after a failed nearby request", async () => {
    const user = userEvent.setup();
    nearbyMocks.loadNearbyPlaces.mockRejectedValue(new Error("offline"));
    const course = { ...courseEditMock, courses: { ...courseEditMock.courses,
      ai: { ...courseEditMock.courses.ai, places: courseEditMock.courses.ai.places.map((p, i) =>
        i === 0 ? { ...p, id: "20000000-0000-4000-8000-000000000001" } : p) },
    }};
    render(<CourseEditor course={course} />);
    await user.click(screen.getByRole("button", { name: "다른 코스 추천받기" }));
    await user.click(screen.getByRole("button", { name: /새 장소 포함/ }));
    expect(await screen.findByText("추천을 불러오지 못했어요. 다시 시도해 주세요.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "이 코스로 변경" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "기존 코스 유지" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("renders the approved mobile regions in reference order", () => {
    render(<CourseEditor course={courseEditMock} />);

    expect(
      screen.getAllByTestId("course-edit-region").map((node) =>
        node.getAttribute("data-region"),
      ),
    ).toEqual(["header", "title", "instructions", "itinerary", "actions"]);

    expect(
      screen.getByRole("heading", { level: 1, name: "일정 수정" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "뒤로가기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "초기화" })).toBeVisible();
  });

  it("pairs fixed time slots with sortable AI course cards", () => {
    render(<CourseEditor course={courseEditMock} />);

    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(5);
    expect(within(itinerary).getByText("08:30")).toBeVisible();
    expect(within(itinerary).getByText("임금님 쌀밥집")).toBeVisible();
    expect(
      within(itinerary).getByRole("button", {
        name: "임금님 쌀밥집 일정 이동",
      }),
    ).toBeVisible();
  });

  it("opens the selected place details from the card content", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(
      screen.getByRole("button", {
        name: "이천 테르메덴 상세 정보 보기",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "장소 상세 정보" });
    expect(within(dialog).getByText("이천 테르메덴")).toBeVisible();
    expect(within(dialog).getByText("온천/워터파크")).toBeVisible();
    expect(
      within(dialog).getByText("경기 이천시 모가면 사실로 984"),
    ).toBeVisible();
    expect(
      within(dialog).getByText(
        "자연 속에서 온천과 물놀이를 함께 즐기는 휴식형 테마파크예요.",
      ),
    ).toBeVisible();
  });

  it("keeps the drag handle separate and returns focus after closing details", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);
    const detailButton = screen.getByRole("button", {
      name: "이천 테르메덴 상세 정보 보기",
    });

    await user.click(detailButton);
    await user.click(
      within(screen.getByRole("dialog", { name: "장소 상세 정보" })).getByRole(
        "button",
        { name: "닫기" },
      ),
    );

    expect(
      screen.queryByRole("dialog", { name: "장소 상세 정보" }),
    ).not.toBeInTheDocument();
    expect(detailButton).toHaveFocus();

    await user.click(
      screen.getByRole("button", { name: "이천 테르메덴 일정 이동" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "장소 상세 정보" }),
    ).not.toBeInTheDocument();
  });

  it("confirms the selected place from the detail modal", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(
      screen.getByRole("button", { name: "설봉공원 상세 정보 보기" }),
    );
    await user.click(
      within(screen.getByRole("dialog", { name: "장소 상세 정보" })).getByRole(
        "button",
        { name: "일정에 반영하기" },
      ),
    );

    expect(
      screen.queryByRole("dialog", { name: "장소 상세 정보" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("설봉공원을 일정에 반영했습니다.");
  });

  it("shows the reorder icon guidance and bottom actions", () => {
    render(<CourseEditor course={courseEditMock} />);

    expect(
      screen.getByText("드래그해서 순서를 변경하거나, '+' 버튼으로 장소를 추가하세요"),
    ).toBeVisible();
    const reorderGuidance = screen.getByText(
      "아이콘을 눌러 순서를 변경할 수 있어요",
    );
    expect(reorderGuidance).toBeVisible();
    expect(reorderGuidance.querySelector(".lucide-menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "장소 추가하기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "저장하기" })).toBeVisible();
  });

  it("renders the supplied AI course itinerary", () => {
    render(<CourseEditor course={courseEditMock} />);

    const aiItinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(aiItinerary).getAllByRole("listitem")[0]).toHaveTextContent(
      "08:30임금님 쌀밥집",
    );
  });

  it("opens nearby search without changing the active draft", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "장소 검색" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { level: 1, name: "일정 수정" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "이천 시립박물관 일정에서 빼기",
      }),
    ).toBeEnabled();
  });

  it("removes a place already in the course from the nearby search screen", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(
      await screen.findByRole("button", { name: "이천 시립박물관 일정에서 빼기" }),
    );

    expect(
      screen.getByRole("button", { name: "이천 시립박물관 선택" }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "일정 수정으로 돌아가기" }),
    );

    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(4);
    expect(
      within(itinerary).queryByText("이천 시립박물관"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("이천 시립박물관을 일정에서 뺐습니다.");
  });

  it("selects multiple places and appends them to the active course", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(
      await screen.findByRole("button", { name: "카페 온천 선택" }),
    );
    expect(
      screen.getByRole("button", { name: "선택한 장소 추가하기 1" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "테르메덴 리조트 선택" }),
    );
    await user.click(
      screen.getByRole("button", { name: "선택한 장소 추가하기 2" }),
    );

    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(7);
    expect(within(itinerary).getByText("카페 온천")).toBeVisible();
    expect(within(itinerary).getByText("테르메덴 리조트")).toBeVisible();
    expect(within(itinerary).getByText("18:00")).toBeVisible();
    expect(within(itinerary).getByText("19:30")).toBeVisible();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("장소 2개를 일정에 추가했습니다.");

    await user.click(screen.getByRole("button", { name: "초기화" }));

    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(5);
    expect(within(itinerary).queryByText("카페 온천")).not.toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("AI 추천 코스를 처음 순서로 되돌렸습니다.");
  });

  it("discards pending place selections when returning to edit", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(
      await screen.findByRole("button", { name: "카페 온천 선택" }),
    );
    await user.click(
      screen.getByRole("button", { name: "일정 수정으로 돌아가기" }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "일정 수정" }),
    ).toBeVisible();
    expect(screen.queryByText("카페 온천")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    expect(
      screen.getByRole("button", { name: "선택한 장소 추가하기 0" }),
    ).toBeDisabled();
  });

  it("announces a time-slot failure after returning to edit", async () => {
    const user = userEvent.setup();
    const lateCourse = {
      ...courseEditMock,
      courses: {
        ...courseEditMock.courses,
        ai: {
          ...courseEditMock.courses.ai,
          slots: courseEditMock.courses.ai.slots.map((slot, index) =>
            index === courseEditMock.courses.ai.slots.length - 1
              ? { ...slot, time: "23:30" }
              : slot,
          ),
        },
      },
    } satisfies CourseEditFixture;

    render(<CourseEditor course={lateCourse} />);
    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(
      await screen.findByRole("button", { name: "카페 온천 선택" }),
    );
    await user.click(
      screen.getByRole("button", { name: "선택한 장소 추가하기 1" }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "일정 수정" }),
    ).toBeVisible();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("추가할 일정 시간을 만들 수 없습니다.");
    expect(screen.queryByText("카페 온천")).not.toBeInTheDocument();
  });

  it("adds selected places to the current course", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(
      await screen.findByRole("button", { name: "카페 온천 선택" }),
    );
    await user.click(
      screen.getByRole("button", { name: "선택한 장소 추가하기 1" }),
    );

    const aiItinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(aiItinerary).getAllByRole("listitem")).toHaveLength(6);
    expect(within(aiItinerary).getByText("카페 온천")).toBeVisible();
  });

  it("persists the active draft and returns to the trips list on success", async () => {
    const user = userEvent.setup();
    savedCourseApiMocks.updateSavedCourse.mockResolvedValue({
      id: courseEditMock.id,
      title: courseEditMock.title,
      savedAt: "2026-09-01T00:00:00.000Z",
      stops: [],
    });
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "저장하기" }));

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith("/trips");
    });
    expect(savedCourseApiMocks.updateSavedCourse).toHaveBeenCalledWith(
      courseEditMock.id,
      expect.objectContaining({
        title: courseEditMock.title,
        stops: expect.arrayContaining([
          expect.objectContaining({ role: "anchor", sequence: 1 }),
        ]),
      }),
    );
  });

  it("shows a status message and does not navigate when saving fails", async () => {
    const user = userEvent.setup();
    savedCourseApiMocks.updateSavedCourse.mockRejectedValue(
      new Error("network down"),
    );
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "저장하기" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "코스를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      ).toBeInTheDocument();
    });
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("creates a new saved course when saving a blank draft", async () => {
    const user = userEvent.setup();
    const blankCourse: CourseEditFixture = {
      id: "new",
      title: "새 일정",
      courses: {
        ai: { source: "ai", slots: [], places: [], recommendedOrder: [] },
        custom: {
          source: "custom",
          slots: [{ id: "custom-slot-1", time: "09:00" }],
          places: [courseEditMock.courses.custom.places[0]!],
          recommendedOrder: [],
        },
      },
    };
    savedCourseApiMocks.saveCourse.mockResolvedValue({
      id: "10000000-0000-4000-8000-000000000001",
      title: blankCourse.title,
      savedAt: "2026-09-01T00:00:00.000Z",
      stops: [],
    });
    render(
      <CourseEditor course={blankCourse} mode="create" initialSource="custom" />,
    );

    await user.click(screen.getByRole("button", { name: "저장하기" }));

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith("/trips");
    });
    expect(savedCourseApiMocks.saveCourse.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ title: "새 일정" }),
    );
    expect(savedCourseApiMocks.updateSavedCourse).not.toHaveBeenCalled();
  });

  it("moves the focused card with the keyboard and announces its new slot", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);
    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    const handle = within(itinerary).getByRole("button", {
      name: "설봉공원 일정 이동",
    });

    handle.focus();
    await user.keyboard("[Space][ArrowUp][ArrowUp][Space]");

    expect(within(itinerary).getAllByRole("listitem")[0]).toHaveTextContent(
      "08:30설봉공원",
    );
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("설봉공원이 1번째 일정으로 이동했습니다.");
    expect(handle).toHaveFocus();
  });

  it("returns through browser history from the header", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "뒤로가기" }));

    expect(routerMocks.back).toHaveBeenCalledOnce();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<CourseEditor course={courseEditMock} />);
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
