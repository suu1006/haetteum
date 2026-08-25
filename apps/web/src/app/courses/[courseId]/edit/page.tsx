import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseEditor } from "@/features/courses/course-editor";
import {
  courseEditMock,
  getEditableCourseById,
} from "@/features/courses/course-edit.mock";

type CourseEditPageProps = {
  params: Promise<{ courseId: string }>;
};

export function generateStaticParams() {
  return [{ courseId: courseEditMock.id }];
}

export async function generateMetadata({
  params,
}: CourseEditPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = getEditableCourseById(courseId);

  if (!course) return { title: "코스를 찾을 수 없어요 | 해뜸" };

  return {
    title: `${course.title} 일정 수정 | 해뜸`,
    description: `${course.title}의 방문 순서를 원하는 대로 변경해 보세요.`,
  };
}

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const { courseId } = await params;
  const course = getEditableCourseById(courseId);

  if (!course) notFound();

  return (
    <main className="min-h-screen bg-background">
      <CourseEditor course={course} />
    </main>
  );
}

export type { CourseEditPageProps };
