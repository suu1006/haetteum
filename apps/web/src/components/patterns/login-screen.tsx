"use client";

import { ChevronLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type LoginScreenProps = {
  canGoBack: boolean;
  loginHref: string;
  errorMessage?: string | null;
};

function LoginScreen({
  canGoBack,
  loginHref,
  errorMessage = null,
}: LoginScreenProps) {
  const router = useRouter();

  function goBack() {
    if (canGoBack) {
      router.back();
      return;
    }

    router.replace("/");
  }

  return (
    <main
      data-testid="login-surface"
      className="min-h-svh bg-background md:grid md:place-items-center md:bg-muted/50 md:p-8"
    >
      <section
        data-testid="login-card"
        aria-labelledby="login-title"
        className="safe-area-top safe-area-bottom flex min-h-svh w-full flex-col bg-card px-5 pb-6 md:min-h-[33.125rem] md:max-w-[26.875rem] md:rounded-[1.75rem] md:border md:border-border/80 md:px-8 md:pb-8 md:shadow-overlay"
      >
        <header className="flex h-16 items-center">
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={goBack}
            className="-ml-2 inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-6" />
          </button>
        </header>

        <div className="pt-14 md:pt-8">
          <div className="flex items-center gap-3 text-primary">
            <span
              data-testid="brand-toggle-mark"
              aria-hidden="true"
              className="relative h-7 w-12 shrink-0 rounded-full bg-primary shadow-card ring-4 ring-primary-subtle"
            >
              <span className="absolute top-1 right-1 size-5 rounded-full bg-white shadow-card" />
            </span>
            <span className="type-title-md font-bold tracking-[-0.04em]">해뜸</span>
          </div>

          <div className="mt-7 max-w-sm">
            <h1
              id="login-title"
              className="break-keep text-[2rem] leading-[1.25] font-bold tracking-[-0.04em] text-foreground"
            >
              여행 기록을 이어서 관리해보세요
            </h1>
            <p className="mt-3 break-keep type-body-md leading-7 text-muted-foreground">
              저장한 일정과 후기, 나만의 추천을 한곳에서 안전하게 관리할 수
              있어요.
            </p>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl bg-primary-subtle px-4 py-3 type-caption text-foreground"
            >
              <p>{errorMessage}</p>
              <a
                href={loginHref}
                className="mt-2 inline-flex min-h-9 items-center font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                다시 시도하기
              </a>
            </div>
          ) : null}
        </div>

        <div className="mt-auto pt-8">
          <a
            href={loginHref}
            className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#fee500] px-5 text-[0.95rem] font-bold text-[#191919] shadow-card outline-none transition-[box-shadow,transform] focus-visible:ring-3 focus-visible:ring-ring/30 active:translate-y-px"
          >
            <span
              aria-hidden="true"
              className="mr-2.5 inline-flex h-4 w-5 items-center justify-center rounded-[50%] bg-[#191919] text-[0.45rem] text-[#fee500]"
            >
              ●
            </span>
            카카오로 계속하기
          </a>
          <p className="mx-2 mt-3 text-center text-[0.72rem] leading-5 text-muted-foreground">
            카카오 계정의 식별자, 닉네임과 프로필 이미지만 사용합니다.
          </p>
        </div>
      </section>
    </main>
  );
}

export { LoginScreen, type LoginScreenProps };
