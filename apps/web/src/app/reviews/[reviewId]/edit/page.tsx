import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewEditorScreen } from "@/components/patterns/review-editor-screen";
import { loadReview } from "@/features/profile/my-reviews-api";

export const metadata: Metadata = {
  title: "후기 수정 | 해뜸",
  description: "작성한 관광지 후기를 수정하세요.",
};

type ReviewEditPageProps = {
  params: Promise<{ reviewId: string }>;
};

export default async function ReviewEditPage({ params }: ReviewEditPageProps) {
  const { reviewId } = await params;
  const result = await loadReview(reviewId);

  if (result.status === "not-found") notFound();

  if (result.status === "error") {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background px-5 pt-[25px] pb-10">
        <header className="mb-7">
          <Link
            href="/reviews"
            className="type-caption inline-flex min-h-11 items-center rounded-lg text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            내 후기로 돌아가기
          </Link>
        </header>
        <main>
          <div role="alert" className="rounded-2xl bg-primary-subtle px-5 py-6">
            <h1 className="type-title-md text-foreground">후기를 불러오지 못했어요</h1>
            <p className="type-caption mt-2 text-muted-foreground">
              잠시 후 다시 시도해 주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return <ReviewEditorScreen mode="edit" initialReview={result.review} />;
}
