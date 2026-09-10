import { CheckIcon } from "lucide-react";

import { AuthPrimaryButton } from "@/components/patterns/auth/auth-primary-button";

type SignupCompleteStepProps = {
  headingId: string;
  onLogin: () => void;
  onGoHome: () => void;
};

function SignupCompleteStep({ headingId, onLogin, onGoHome }: SignupCompleteStepProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <span
        aria-hidden="true"
        className="inline-flex size-16 items-center justify-center rounded-full bg-primary-subtle text-primary"
      >
        <CheckIcon aria-hidden="true" className="size-8" />
      </span>
      <h1
        id={headingId}
        className="mt-5 text-[1.375rem] font-bold tracking-[-0.04em] text-foreground"
      >
        회원가입이 완료되었어요!
      </h1>
      <p className="mt-2 max-w-xs break-keep type-body-md leading-6 text-muted-foreground">
        이제 해뜸에서 원하는 여행을 자유롭게 떠나보세요.
      </p>
      <AuthPrimaryButton onClick={onLogin} className="mt-7">
        로그인하기
      </AuthPrimaryButton>
      <button
        type="button"
        onClick={onGoHome}
        className="mt-4 type-caption font-semibold text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        홈으로 가기
      </button>
    </div>
  );
}

export { SignupCompleteStep, type SignupCompleteStepProps };
