import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  savedCoursesQueryKey,
  useRemoveSavedCourse,
  useSaveCourse,
} from "@/features/trips/saved-course-query";

const { loadMySavedCourses, saveCourse, removeSavedCourse } = vi.hoisted(
  () => ({
    loadMySavedCourses: vi.fn(),
    saveCourse: vi.fn(),
    removeSavedCourse: vi.fn(),
  }),
);

vi.mock("@/features/trips/saved-course-api", () => ({
  loadMySavedCourses,
  saveCourse,
  removeSavedCourse,
}));

const savedCourse = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "예술의전당 근처 코스",
  savedAt: "2026-09-01T03:00:00.000Z",
  stops: [
    {
      role: "anchor" as const,
      sequence: 1,
      placeId: "20000000-0000-4000-8000-000000000001",
      title: "예술의전당",
      categoryLabel: null,
      address: "서울 서초구 서초동",
      longitude: 127.01,
      latitude: 37.48,
      distanceMeters: null,
      placeUrl: null,
    },
  ],
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useSaveCourse", () => {
  it("prepends the newly saved course to the cached list", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(savedCoursesQueryKey(), { items: [] });
    saveCourse.mockResolvedValue(savedCourse);
    loadMySavedCourses.mockResolvedValue({ items: [savedCourse] });

    const { result } = renderHook(() => useSaveCourse(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        title: savedCourse.title,
        stops: savedCourse.stops,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      queryClient.getQueryData<{ items: { id: string }[] }>(
        savedCoursesQueryKey(),
      )?.items,
    ).toEqual([savedCourse]);
  });
});

describe("useRemoveSavedCourse", () => {
  it("removes the course from the cached list on success", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(savedCoursesQueryKey(), {
      items: [savedCourse],
    });
    removeSavedCourse.mockResolvedValue(undefined);
    loadMySavedCourses.mockResolvedValue({ items: [] });

    const { result } = renderHook(() => useRemoveSavedCourse(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(savedCourse.id);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      queryClient.getQueryData<{ items: unknown[] }>(savedCoursesQueryKey()),
    ).toEqual({ items: [] });
  });
});
