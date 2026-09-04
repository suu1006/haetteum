import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  MySavedCoursesResponse,
  UpdateSavedCourseRequest,
} from "@haetteum/contracts";

import {
  loadMySavedCourses,
  removeSavedCourse,
  saveCourse,
  updateSavedCourse,
} from "@/features/trips/saved-course-api";

const SAVED_COURSES_STALE_TIME_MS = 60_000;

export function savedCoursesQueryKey() {
  return ["saved-courses", "mine"] as const;
}

export function savedCoursesQueryOptions() {
  return queryOptions({
    queryKey: savedCoursesQueryKey(),
    queryFn: loadMySavedCourses,
    staleTime: SAVED_COURSES_STALE_TIME_MS,
  });
}

export function useSaveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveCourse,
    onSuccess: (saved) => {
      queryClient.setQueryData<MySavedCoursesResponse>(
        savedCoursesQueryKey(),
        (current) => ({ items: [saved, ...(current?.items ?? [])] }),
      );
      void queryClient.invalidateQueries({ queryKey: savedCoursesQueryKey() });
    },
  });
}

export function useUpdateSavedCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; data: UpdateSavedCourseRequest }) =>
      updateSavedCourse(input.id, input.data),
    onSuccess: (saved) => {
      queryClient.setQueryData<MySavedCoursesResponse>(
        savedCoursesQueryKey(),
        (current) => ({
          items: (current?.items ?? []).map((item) =>
            item.id === saved.id ? saved : item,
          ),
        }),
      );
      void queryClient.invalidateQueries({ queryKey: savedCoursesQueryKey() });
    },
  });
}

export function useRemoveSavedCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeSavedCourse,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<MySavedCoursesResponse>(
        savedCoursesQueryKey(),
        (current) => ({
          items: (current?.items ?? []).filter((item) => item.id !== id),
        }),
      );
      void queryClient.invalidateQueries({ queryKey: savedCoursesQueryKey() });
    },
  });
}
