import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  favoritesQueryKey,
  useTogglePlaceFavorite,
} from "@/features/places/favorite-place-query";

const { addFavorite, removeFavorite } = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

vi.mock("@/features/places/favorite-place-api", () => ({
  addFavorite,
  removeFavorite,
  loadMyFavorites: vi.fn(),
}));

const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const toggleInput = {
  placeId: PLACE_ID,
  title: "에버랜드",
  location: "경기 용인",
  primaryImageUrl: "https://example.test/everland.jpg",
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

describe("useTogglePlaceFavorite", () => {
  it("adds the place to the cached favorites list before the request resolves", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(favoritesQueryKey(), { items: [] });
    let resolveAdd: (() => void) | undefined;
    addFavorite.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = () =>
          resolve({
            id: PLACE_ID,
            title: toggleInput.title,
            location: toggleInput.location,
            primaryImageUrl: toggleInput.primaryImageUrl,
            favoritedAt: "2026-08-31T00:00:00.000Z",
          });
      }),
    );

    const { result } = renderHook(() => useTogglePlaceFavorite(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ ...toggleInput, nextFavorited: true });
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ items: { id: string }[] }>(
          favoritesQueryKey(),
        )?.items,
      ).toHaveLength(1),
    );
    expect(
      queryClient.getQueryData<{ items: { id: string }[] }>(
        favoritesQueryKey(),
      )?.items[0],
    ).toMatchObject({ id: PLACE_ID, title: toggleInput.title });

    resolveAdd?.();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls the cache back to its previous state when the add request fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(favoritesQueryKey(), { items: [] });
    addFavorite.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useTogglePlaceFavorite(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ ...toggleInput, nextFavorited: true });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      queryClient.getQueryData<{ items: unknown[] }>(favoritesQueryKey()),
    ).toEqual({ items: [] });
  });

  it("optimistically removes a place and restores it on failure", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const existing = {
      id: PLACE_ID,
      title: toggleInput.title,
      location: toggleInput.location,
      primaryImageUrl: toggleInput.primaryImageUrl,
      favoritedAt: "2026-08-31T00:00:00.000Z",
    };
    queryClient.setQueryData(favoritesQueryKey(), { items: [existing] });
    let rejectRemove: (() => void) | undefined;
    removeFavorite.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRemove = () => reject(new Error("network down"));
      }),
    );

    const { result } = renderHook(() => useTogglePlaceFavorite(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ ...toggleInput, nextFavorited: false });
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ items: unknown[] }>(favoritesQueryKey())
          ?.items,
      ).toHaveLength(0),
    );

    rejectRemove?.();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      queryClient.getQueryData<{ items: unknown[] }>(favoritesQueryKey()),
    ).toEqual({ items: [existing] });
  });
});
