import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { MyFavoritesResponse } from "@haetteum/contracts";

import {
  addFavorite,
  loadMyFavorites,
  removeFavorite,
} from "@/features/places/favorite-place-api";

const FAVORITES_STALE_TIME_MS = 60_000;

export function favoritesQueryKey() {
  return ["favorites", "mine"] as const;
}

export function favoritesQueryOptions() {
  return queryOptions({
    queryKey: favoritesQueryKey(),
    queryFn: loadMyFavorites,
    staleTime: FAVORITES_STALE_TIME_MS,
  });
}

/// 로그인하지 않은 사용자는 API 호출 없이 항상 찜하지 않은 상태로 취급한다.
export function useIsPlaceFavorited(placeId: string, enabled: boolean) {
  const { data } = useQuery({ ...favoritesQueryOptions(), enabled });
  return data?.items.some((item) => item.id === placeId) ?? false;
}

export type TogglePlaceFavoriteInput = {
  placeId: string;
  title: string;
  location: string;
  primaryImageUrl: string | null;
  nextFavorited: boolean;
};

type TogglePlaceFavoriteContext = {
  previous: MyFavoritesResponse | undefined;
};

export function useTogglePlaceFavorite() {
  const queryClient = useQueryClient();

  return useMutation<
    FavoritePlaceItemOrVoid,
    unknown,
    TogglePlaceFavoriteInput,
    TogglePlaceFavoriteContext
  >({
    mutationFn: (input) =>
      input.nextFavorited
        ? addFavorite(input.placeId)
        : removeFavorite(input.placeId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: favoritesQueryKey() });
      const previous = queryClient.getQueryData<MyFavoritesResponse>(
        favoritesQueryKey(),
      );

      queryClient.setQueryData<MyFavoritesResponse>(
        favoritesQueryKey(),
        (current) => applyOptimisticToggle(current, input),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context) {
        queryClient.setQueryData(favoritesQueryKey(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: favoritesQueryKey() });
    },
  });
}

type FavoritePlaceItemOrVoid = Awaited<
  ReturnType<typeof addFavorite> | ReturnType<typeof removeFavorite>
>;

function applyOptimisticToggle(
  current: MyFavoritesResponse | undefined,
  input: TogglePlaceFavoriteInput,
): MyFavoritesResponse {
  const items = current?.items ?? [];

  if (!input.nextFavorited) {
    return { items: items.filter((item) => item.id !== input.placeId) };
  }
  if (items.some((item) => item.id === input.placeId)) {
    return { items };
  }
  return {
    items: [
      {
        id: input.placeId,
        title: input.title,
        location: input.location,
        primaryImageUrl: input.primaryImageUrl,
        favoritedAt: new Date().toISOString(),
      },
      ...items,
    ],
  };
}
