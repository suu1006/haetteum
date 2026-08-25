import { RouteOffIcon } from "lucide-react";
import Link from "next/link";

export default function CourseEditNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[30rem] items-center justify-center bg-background px-4 text-center">
      <section aria-labelledby="course-not-found-title">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <RouteOffIcon className="size-6" aria-hidden="true" />
        </span>
        <h1
          id="course-not-found-title"
          className="type-title-lg mt-5 text-foreground"
        >
          코스를 찾을 수 없어요
        </h1>
        <p className="type-body-md mt-2 text-muted-foreground">
          요청한 코스가 없거나 이동되었어요.
        </p>
        <Link
          href="/"
          className="type-label mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          여행 탐색으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
