import { MailIcon } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";

import { AuthDivider } from "@/components/patterns/auth/auth-divider";
import { AuthPasswordField } from "@/components/patterns/auth/auth-password-field";
import { AuthPrimaryButton } from "@/components/patterns/auth/auth-primary-button";
import {
  AuthSocialLinkButton,
  KakaoGlyph,
} from "@/components/patterns/auth/auth-social-button";
import { AuthTextField } from "@/components/patterns/auth/auth-text-field";

type EmailCredentialsStepProps = {
  headingId: string;
  emailId: string;
  passwordId: string;
  passwordConfirmId: string;
  email: string;
  password: string;
  passwordConfirm: string;
  showPassword: boolean;
  showPasswordConfirm: boolean;
  error: string | null;
  submitting: boolean;
  passwordHint: string;
  kakaoSignupHref: string;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordConfirmChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleShowPassword: () => void;
  onToggleShowPasswordConfirm: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function EmailCredentialsStep({
  headingId,
  emailId,
  passwordId,
  passwordConfirmId,
  email,
  password,
  passwordConfirm,
  showPassword,
  showPasswordConfirm,
  error,
  submitting,
  passwordHint,
  kakaoSignupHref,
  onEmailChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onToggleShowPassword,
  onToggleShowPasswordConfirm,
  onSubmit,
}: EmailCredentialsStepProps) {
  return (
    <div className="pt-2">
      <h1
        id={headingId}
        className="max-w-[19rem] break-keep text-[1.5rem] leading-[1.35] font-bold tracking-[-0.04em] text-foreground"
      >
        회원가입을 위해
        <br />
        정보를 입력해주세요.
      </h1>
      <p className="mt-3 max-w-sm break-keep type-body-md leading-6 text-muted-foreground">
        간단한 정보만으로 해뜸의 모든 서비스를 이용할 수 있어요.
      </p>

      {error ? (
        <p role="alert" className="mt-4 type-caption text-destructive">
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <AuthTextField
          id={emailId}
          label="이메일 주소"
          icon={MailIcon}
          type="email"
          required
          autoComplete="email"
          placeholder="이메일 주소"
          value={email}
          onChange={onEmailChange}
        />

        <AuthPasswordField
          id={passwordId}
          label="비밀번호"
          show={showPassword}
          onToggleShow={onToggleShowPassword}
          required
          autoComplete="new-password"
          placeholder="비밀번호"
          value={password}
          onChange={onPasswordChange}
        />

        <AuthPasswordField
          id={passwordConfirmId}
          label="비밀번호 확인"
          show={showPasswordConfirm}
          onToggleShow={onToggleShowPasswordConfirm}
          required
          autoComplete="new-password"
          placeholder="비밀번호 확인"
          value={passwordConfirm}
          onChange={onPasswordConfirmChange}
        />

        <p className="type-caption text-muted-foreground">{passwordHint}</p>

        <AuthPrimaryButton type="submit" loading={submitting} loadingLabel="확인 중...">
          다음
        </AuthPrimaryButton>
      </form>

      <AuthDivider />

      <AuthSocialLinkButton href={kakaoSignupHref} icon={<KakaoGlyph />} className="mt-6">
        카카오로 가입하기
      </AuthSocialLinkButton>
    </div>
  );
}

export { EmailCredentialsStep, type EmailCredentialsStepProps };
