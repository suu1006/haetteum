export type MyReviewsTabId = "written" | "bookmarked";

export type MyReviewItem = {
  id: string;
  placeId: string;
  title: string;
  location: string;
  rating: number;
  date: string;
  content: string;
  likeCount: number;
  commentCount: number;
  bookmarked: boolean;
  image: {
    src: string;
    alt: string;
  };
};

export type MyReviewsData = Record<MyReviewsTabId, readonly MyReviewItem[]>;

export type MyWrittenReviewsLoadState =
  | { status: "ready"; items: MyReviewItem[] }
  | { status: "error" };
