"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[30rem] items-center justify-center bg-background px-4 text-center">
      <section aria-labelledby="error-title">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <TriangleAlertIcon className="size-6" aria-hidden="true" />
        </span>
        <h1 id="error-title" className="type-title-lg mt-5 text-foreground">
          문제가 발생했어요
        </h1>
        <p className="type-body-md mt-2 text-muted-foreground">
          일시적인 오류가 발생했어요. 다시 시도해 주세요.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={reset}>다시 시도하기</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            홈으로 가기
          </Button>
        </div>
      </section>
    </main>
  );
}
