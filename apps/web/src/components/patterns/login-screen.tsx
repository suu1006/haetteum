"use client";

import { MailIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthDivider } from "@/components/patterns/auth/auth-divider";
import { AuthPasswordField } from "@/components/patterns/auth/auth-password-field";
import { AuthPrimaryButton } from "@/components/patterns/auth/auth-primary-button";
import { AuthShell } from "@/components/patterns/auth/auth-shell";
import {
  AuthSocialActionButton,
  AuthSocialLinkButton,
  KakaoGlyph,
} from "@/components/patterns/auth/auth-social-button";
import { AuthTextField } from "@/components/patterns/auth/auth-text-field";
import { loginWithEmail } from "@/features/auth/auth-client";
import { useAuthStore } from "@/features/auth/auth-store";

type LoginScreenProps = {
  loginHref: string;
  errorMessage?: string | null;
  returnTo?: string;
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.35H12v4.45h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.75Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function LoginScreen({
  loginHref,
  errorMessage = null,
  returnTo = "/",
}: LoginScreenProps) {
  const router = useRouter();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  function announceComingSoon(message: string) {
    setNotice(`${message} 아직 준비 중이에요. 카카오로 로그인해 주세요.`);
  }

  async function handleEmailLoginSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setNotice(null);
    setSigningIn(true);
    const result = await loginWithEmail(email, password);
    setSigningIn(false);

    if (!result.ok) {
      setNotice(result.message);
      return;
    }

    setAuthenticated(result.user);
    router.push(returnTo);
  }

  return (
    <AuthShell
      surfaceTestId="login-surface"
      cardTestId="login-card"
      ariaLabelledBy="login-title"
      surfaceClassName="grid place-items-center bg-muted/50 p-4 sm:p-8"
      className="relative min-h-0 max-w-[26.875rem] overflow-hidden rounded-[1.75rem] border border-border/80 px-5 pt-8! pb-0! shadow-overlay sm:px-8 md:min-h-0 md:pb-0"
    >
      <Link
        href="/"
        aria-label="해뜸 메인페이지로 이동"
        className="mx-auto inline-flex shrink-0 items-center justify-center rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <Image
          src="/images/login_logo.svg"
          alt="해뜸"
          width={1672}
          height={941}
          unoptimized
          className="h-auto w-[6.5rem]"
        />
      </Link>
      <h1 id="login-title" className="sr-only">로그인</h1>

      <div aria-live="polite" className="empty:hidden">
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
        {notice ? (
          <p
            role="status"
            className="mt-5 rounded-2xl bg-muted px-4 py-3 type-caption text-muted-foreground"
          >
            {notice}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleEmailLoginSubmit} className="mt-4 space-y-3">
        <AuthTextField
          id={emailId}
          label="이메일 주소 또는 아이디"
          icon={MailIcon}
          type="text"
          autoComplete="username"
          placeholder="이메일 주소 또는 아이디"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <AuthPasswordField
          id={passwordId}
          label="비밀번호"
          show={showPassword}
          onToggleShow={() => setShowPassword((value) => !value)}
          showAriaPressed
          autoComplete="current-password"
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 type-caption text-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="size-4 rounded border-border text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
            />
            로그인 상태 유지
          </label>
          <button
            type="button"
            onClick={() => announceComingSoon("비밀번호 재설정은")}
            className="type-caption font-semibold text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <AuthPrimaryButton type="submit" loading={signingIn} loadingLabel="로그인 중...">
          로그인
        </AuthPrimaryButton>
      </form>

      <AuthDivider />

      <div className="mt-6 space-y-3">
        <AuthSocialLinkButton href={loginHref} icon={<KakaoGlyph />}>
          카카오로 로그인하기
        </AuthSocialLinkButton>
        <AuthSocialActionButton
          icon={<GoogleIcon />}
          onClick={() => announceComingSoon("구글 로그인은")}
        >
          구글로 로그인하기
        </AuthSocialActionButton>
      </div>

      <p className="mt-6 text-center type-caption text-muted-foreground">
        계정이 없으신가요?{" "}
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          회원가입하기
        </button>
      </p>

      <div
        aria-hidden="true"
        className="pointer-events-none relative -mx-5 h-16 shrink-0 sm:-mx-8"
      >
        <svg
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full text-primary-subtle"
        >
          <path
            fill="currentColor"
            d="M0 80V38l40-20 35 14 45-26 50 22 40-16 45 20 50-14 45 18 50-16v60Z"
          />
        </svg>
        <svg viewBox="0 0 32 40" className="absolute right-7 bottom-5 h-9 w-7">
          <ellipse cx="16" cy="14" rx="12" ry="14" fill="var(--color-primary)" />
          <path
            d="M11 26 8 32h16l-3-6"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect x="12" y="32" width="8" height="5" rx="1.5" fill="var(--color-foreground)" />
        </svg>
      </div>
    </AuthShell>
  );
}

export { LoginScreen, type LoginScreenProps };
