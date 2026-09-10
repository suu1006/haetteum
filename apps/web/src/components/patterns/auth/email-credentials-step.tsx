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
  kakaoSignupHref: string;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordConfirmChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleShowPassword: () => void;
  onToggleShowPasswordConfirm: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function EmailCredentialsStep({
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
  kakaoSignupHref,
  onEmailChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onToggleShowPassword,
  onToggleShowPasswordConfirm,
  onSubmit,
}: EmailCredentialsStepProps) {
  return (
    <div>
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
          autoComplete="new-password"
          placeholder="비밀번호 확인"
          value={passwordConfirm}
          onChange={onPasswordConfirmChange}
        />

        {error ? (
          <p role="alert" className="type-caption text-destructive">
            {error}
          </p>
        ) : null}

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
