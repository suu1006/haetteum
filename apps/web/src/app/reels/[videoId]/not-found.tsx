import Link from "next/link";
import { VideoOffIcon } from "lucide-react";

export default function ReelsNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[30rem] items-center justify-center bg-background px-4 text-center">
      <section aria-labelledby="reels-not-found-title">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <VideoOffIcon aria-hidden="true" className="size-6" />
        </span>
        <h1
          id="reels-not-found-title"
          className="type-title-lg mt-5 text-foreground"
        >
          영상을 찾을 수 없어요
        </h1>
        <p className="type-body-md mt-2 text-muted-foreground">
          요청한 영상이 없거나 이동되었어요.
        </p>
        <Link
          href="/?tab=places"
          className="type-label mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          인기 관광지로 돌아가기
        </Link>
      </section>
    </main>
  );
}
