import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SavedCourseExperience } from "@/features/courses/saved-course-experience";
import {
  getSavedCourseById,
  savedCourseMock,
} from "@/features/courses/saved-course.mock";

type SavedCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export function generateStaticParams() {
  return [{ courseId: savedCourseMock.id }];
}

export async function generateMetadata({
  params,
}: SavedCoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = getSavedCourseById(courseId);

  if (!course) return { title: "저장된 코스를 찾을 수 없어요 | 해뜸" };

  return {
    title: `${course.title} | 해뜸`,
    description: `${course.title}의 저장된 여행 일정과 이동 정보를 확인해 보세요.`,
  };
}

export default async function SavedCoursePage({ params }: SavedCoursePageProps) {
  const { courseId } = await params;
  const course = getSavedCourseById(courseId);

  if (!course) notFound();

  return <SavedCourseExperience course={course} />;
}
