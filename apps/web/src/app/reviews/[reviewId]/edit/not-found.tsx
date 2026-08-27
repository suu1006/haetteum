import Link from "next/link";

export default function ReviewEditNotFound() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background px-5 pt-[25px] pb-10">
      <main className="rounded-2xl bg-primary-subtle px-5 py-6">
        <h1 className="type-title-md text-foreground">후기를 찾을 수 없어요</h1>
        <p className="type-caption mt-2 text-muted-foreground">
          삭제되었거나 접근할 수 없는 후기예요.
        </p>
        <Link
          href="/reviews"
          className="type-label mt-5 inline-flex min-h-11 items-center rounded-lg text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          내 후기로 돌아가기
        </Link>
      </main>
    </div>
  );
}
