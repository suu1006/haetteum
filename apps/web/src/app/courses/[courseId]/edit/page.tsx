import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SavedCourseIdParamsSchema } from "@haetteum/contracts";

import { requireCurrentUser } from "@/features/auth/auth-server";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";
import { CourseEditor } from "@/features/courses/course-editor";
import { createEmptyCourse, mapSavedCourseToEditData } from "@/features/courses/course-edit-model";
import { loadSavedCourseById } from "@/features/trips/my-saved-courses-api";
import { ErrorState } from "@/components/patterns/error-state/error-state";

type CourseEditPageProps = { params: Promise<{ courseId: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CourseEditPageProps): Promise<Metadata> {
  const { courseId } = await params;
  return {
    title: courseId === "new" ? "새 일정 만들기 | 해뜸" : "일정 수정 | 해뜸",
    robots: { index: false, follow: false },
  };
}

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const { courseId } = await params;
  const isNew = courseId === "new";
  if (!isNew && !SavedCourseIdParamsSchema.safeParse({ id: courseId }).success) notFound();
  const user = await requireCurrentUser(`/courses/${courseId}/edit`);
  const result = isNew ? null : await loadSavedCourseById(courseId, (await headers()).get("cookie"));
  if (result?.status === "not-found") notFound();
  if (result?.status === "error") {
    return <main role="alert"><ErrorState title="코스를 불러오지 못했어요" /></main>;
  }
  const course = result?.status === "ready" ? mapSavedCourseToEditData(result.data) : createEmptyCourse();
  return (
    <>
      <AuthUserHydrator user={user} />
      <main className="min-h-screen bg-background">
        <CourseEditor course={course} initialSource="custom" mode={isNew ? "create" : "edit"} />
      </main>
    </>
  );
}

export type { CourseEditPageProps };
