"use client";

import { useRouter } from "next/navigation";

function PlaceRankingRetryButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="type-label mt-3 inline-flex text-primary underline-offset-4 hover:underline"
      onClick={() => router.refresh()}
    >
      다시 시도하기
    </button>
  );
}

export { PlaceRankingRetryButton };
