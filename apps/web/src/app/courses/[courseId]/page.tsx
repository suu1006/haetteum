import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SavedCourseIdParamsSchema } from "@haetteum/contracts";

import { requireCurrentUser } from "@/features/auth/auth-server";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";
import { SavedCourseExperience } from "@/features/courses/saved-course-experience";
import { loadSavedCourseById } from "@/features/trips/my-saved-courses-api";
import { ErrorState } from "@/components/patterns/error-state/error-state";

type SavedCoursePageProps = { params: Promise<{ courseId: string }> };
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "저장한 코스 | 해뜸",
  robots: { index: false, follow: false },
};

export default async function SavedCoursePage({ params }: SavedCoursePageProps) {
  const { courseId } = await params;
  if (!SavedCourseIdParamsSchema.safeParse({ id: courseId }).success) notFound();
  const user = await requireCurrentUser(`/courses/${courseId}`);
  const result = await loadSavedCourseById(courseId, (await headers()).get("cookie"));
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    return <main role="alert"><ErrorState title="코스를 불러오지 못했어요" /></main>;
  }
  return <><AuthUserHydrator user={user} /><SavedCourseExperience course={result.data} /></>;
}
