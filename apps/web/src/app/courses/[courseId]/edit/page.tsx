import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/features/auth/auth-server";
import { CourseEditor } from "@/features/courses/course-editor";
import {
  blankCourseMock,
  courseEditMock,
  getEditableCourseById,
} from "@/features/courses/course-edit.mock";
import {
  mapSavedCourseToEditFixture,
  type CourseEditFixture,
} from "@/features/courses/course-edit-model";
import { loadSavedCourseById } from "@/features/trips/my-saved-courses-api";

type CourseEditPageProps = {
  params: Promise<{ courseId: string }>;
};

export function generateStaticParams() {
  return [{ courseId: courseEditMock.id }, { courseId: blankCourseMock.id }];
}

async function resolveCourse(
  courseId: string,
): Promise<CourseEditFixture | undefined> {
  const mockCourse = getEditableCourseById(courseId);
  if (mockCourse) return mockCourse;

  await requireCurrentUser(`/courses/${courseId}/edit`);
  const cookieHeader = (await headers()).get("cookie");
  const result = await loadSavedCourseById(courseId, cookieHeader);

  return result.status === "ready"
    ? mapSavedCourseToEditFixture(result.data)
    : undefined;
}

export async function generateMetadata({
  params,
}: CourseEditPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = await resolveCourse(courseId);

  if (!course) return { title: "코스를 찾을 수 없어요 | 해뜸" };

  if (course.id === blankCourseMock.id) {
    return {
      title: "새 일정 만들기 | 해뜸",
      description: "원하는 장소를 추가해 나만의 일정을 만들어 보세요.",
    };
  }

  return {
    title: `${course.title} 일정 수정 | 해뜸`,
    description: `${course.title}의 방문 순서를 원하는 대로 변경해 보세요.`,
  };
}

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const { courseId } = await params;
  const course = await resolveCourse(courseId);

  if (!course) notFound();

  return (
    <main className="min-h-screen bg-background">
      <CourseEditor
        course={course}
        initialSource={course.id === blankCourseMock.id ? "custom" : "ai"}
        mode={course.id === blankCourseMock.id ? "create" : "edit"}
      />
    </main>
  );
}

export type { CourseEditPageProps };
