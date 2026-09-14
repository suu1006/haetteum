import type { UpdateReviewRequest } from "@haetteum/contracts";

/** Valid defaults keep auth/ownership tests from failing earlier on input validation. */
export function reviewInput(
  overrides: Partial<UpdateReviewRequest> = {},
): UpdateReviewRequest {
  return {
    title: "여행 후기",
    content: "여행 중 방문한 장소의 후기입니다.",
    rating: 5,
    images: [],
    ...overrides,
  };
}
