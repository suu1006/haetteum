"use client";

import { useEffect } from "react";

import "./globals.css";

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-[30rem] items-center justify-center bg-background px-4 text-center">
          <section aria-labelledby="global-error-title">
            <h1
              id="global-error-title"
              className="type-title-lg mt-5 text-foreground"
            >
              문제가 발생했어요
            </h1>
            <p className="type-body-md mt-2 text-muted-foreground">
              앱을 불러오는 중 오류가 발생했어요. 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={reset}
              className="type-label mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              다시 시도하기
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
