import { OtpCodeInput } from "@/components/patterns/auth/otp-code-input";

type EmailVerifyStepProps = {
  headingId: string;
  email: string;
  onEditEmail: () => void;
  codeLength: number;
  code: string[];
  onCodeChange: (next: string[]) => void;
  onCodeComplete: (candidate: string) => void;
  verifying: boolean;
  remainingLabel: string;
  verifyError: string | null;
  resending: boolean;
  onResend: () => void;
};

function EmailVerifyStep({
  headingId,
  email,
  onEditEmail,
  codeLength,
  code,
  onCodeChange,
  onCodeComplete,
  verifying,
  remainingLabel,
  verifyError,
  resending,
  onResend,
}: EmailVerifyStepProps) {
  return (
    <div className="pt-5">
      <h2
        id={headingId}
        className="break-keep text-xl leading-[1.35] font-bold tracking-[-0.04em] text-foreground"
      >
        이메일 주소를 확인해주세요.
      </h2>
      <p className="mt-3 max-w-sm break-keep type-body-md leading-6 text-muted-foreground">
        입력하신 이메일로 인증번호가 전송되었습니다.
        <br />
        이메일을 확인하고 인증번호를 입력해주세요.
      </p>

      <div className="mt-5 flex h-14 items-center justify-between rounded-2xl border border-border bg-card px-4 type-body-md text-foreground">
        <span className="truncate">{email}</span>
        <button
          type="button"
          onClick={onEditEmail}
          aria-label="이메일 주소 수정"
          className="ml-2 shrink-0 text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          수정
        </button>
      </div>

      <OtpCodeInput
        length={codeLength}
        value={code}
        onChange={onCodeChange}
        onComplete={onCodeComplete}
        disabled={verifying}
        ariaLabel={`인증번호 ${codeLength}자리`}
        className="mt-5"
      />

      <p className="mt-3 type-caption text-muted-foreground">{remainingLabel}</p>

      {verifyError ? (
        <p role="alert" className="mt-2 type-caption text-destructive">
          {verifyError}
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl bg-muted px-4 py-3 type-caption text-muted-foreground">
        <p className="font-semibold text-foreground">인증번호를 받지 못하셨나요?</p>
        <p className="mt-1">스팸 메일함을 확인해주세요.</p>
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="mt-2 font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-60"
        >
          {resending ? "재전송 중..." : "인증번호 다시 받기"}
        </button>
      </div>
    </div>
  );
}

export { EmailVerifyStep, type EmailVerifyStepProps };
