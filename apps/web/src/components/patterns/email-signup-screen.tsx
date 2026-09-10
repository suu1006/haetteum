"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import type { PlaceRegion, TravelStyle } from "@haetteum/contracts";

import { AuthHeader } from "@/components/patterns/auth/auth-header";
import { AuthShell } from "@/components/patterns/auth/auth-shell";
import { EmailCredentialsStep } from "@/components/patterns/auth/email-credentials-step";
import { EmailVerifyStep } from "@/components/patterns/auth/email-verify-step";
import { ProfileInfoStep } from "@/components/patterns/auth/profile-info-step";
import { SignupCompleteStep } from "@/components/patterns/auth/signup-complete-step";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  startEmailSignup,
  verifyEmailSignupCode,
} from "@/features/auth/email-signup-client";
import { uploadProfilePhoto } from "@/features/profile/profile-photo-api";
import { updateProfilePreferences } from "@/features/profile/profile-preferences-api";

type EmailSignupScreenProps = {
  canGoBack: boolean;
  kakaoSignupHref: string;
};

type Step = "credentials" | "verify" | "profile" | "complete";

const TRAVEL_STYLE_OPTIONS: { value: TravelStyle; label: string }[] = [
  { value: "nature_healing", label: "자연/힐링" },
  { value: "food_tour", label: "맛집 탐방" },
  { value: "culture_history", label: "문화/역사" },
  { value: "activity", label: "액티비티" },
  { value: "shopping", label: "쇼핑" },
  { value: "etc", label: "기타" },
];
const REGION_OPTIONS: { value: PlaceRegion; label: string }[] = [
  { value: "seoul", label: "서울" },
  { value: "gyeonggi", label: "경기" },
  { value: "gangwon", label: "강원" },
  { value: "busan", label: "부산" },
  { value: "jeju", label: "제주" },
];
const CODE_LENGTH = 6;
const PASSWORD_HINT = "8자 이상, 영문, 숫자, 특수문자를 포함해주세요.";
const EMAIL_SIGNUP_TITLE_ID = "email-signup-title";

function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function EmailSignupScreen({
  canGoBack,
  kakaoSignupHref,
}: EmailSignupScreenProps) {
  const router = useRouter();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const emailId = useId();
  const passwordId = useId();
  const passwordConfirmId = useId();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(
    null,
  );
  const [submittingCredentials, setSubmittingCredentials] = useState(false);

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const [travelStyles, setTravelStyles] = useState<TravelStyle[]>([]);
  const [interestedRegions, setInterestedRegions] = useState<PlaceRegion[]>(
    [],
  );
  const [regionQuery, setRegionQuery] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!codeExpiresAt) return;

    const tick = () => {
      const secondsLeft = Math.max(
        0,
        Math.round((codeExpiresAt.getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(secondsLeft);
    };

    tick();
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, [codeExpiresAt]);

  function goBack() {
    if (canGoBack) {
      router.back();
      return;
    }
    router.replace("/");
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredentialsError(null);

    if (!isValidPassword(password)) {
      setCredentialsError(PASSWORD_HINT);
      return;
    }
    if (password !== passwordConfirm) {
      setCredentialsError("비밀번호가 일치하지 않아요.");
      return;
    }

    setSubmittingCredentials(true);
    const result = await startEmailSignup(email, password);
    setSubmittingCredentials(false);

    if (!result.ok) {
      setCredentialsError(result.message);
      return;
    }

    setCodeExpiresAt(new Date(result.data.codeExpiresAt));
    setCode(Array(CODE_LENGTH).fill(""));
    setVerifyError(null);
    setStep("verify");
  }

  async function submitCode(candidate: string) {
    if (candidate.length !== CODE_LENGTH || verifying) return;

    setVerifying(true);
    setVerifyError(null);
    const result = await verifyEmailSignupCode(email, candidate);
    setVerifying(false);

    if (!result.ok) {
      setVerifyError(result.message);
      return;
    }

    setAuthenticated(result.data.user);
    setPassword("");
    setStep("profile");
  }

  async function handleResend() {
    setResending(true);
    setVerifyError(null);
    const result = await startEmailSignup(email, password);
    setResending(false);

    if (!result.ok) {
      setVerifyError(result.message);
      return;
    }

    setCodeExpiresAt(new Date(result.data.codeExpiresAt));
    setCode(Array(CODE_LENGTH).fill(""));
  }

  function toggleTravelStyle(style: string) {
    const value = style as TravelStyle;
    setTravelStyles((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleRegion(region: string) {
    const value = region as PlaceRegion;
    setInterestedRegions((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileError(null);
    setUploadingPhoto(true);
    const result = await uploadProfilePhoto(file);
    setUploadingPhoto(false);

    if (result.status === "error") {
      setProfileError(result.message);
      return;
    }
    setProfilePhotoUrl(result.profileImageUrl);
  }

  async function handleProfileSubmit() {
    setProfileError(null);
    setSavingProfile(true);
    const result = await updateProfilePreferences(
      travelStyles,
      interestedRegions,
    );
    setSavingProfile(false);

    if (!result.ok) {
      setProfileError(result.message);
      return;
    }

    setStep("complete");
  }

  return (
    <AuthShell
      surfaceTestId="email-signup-surface"
      cardTestId="email-signup-card"
      ariaLabelledBy={EMAIL_SIGNUP_TITLE_ID}
      surfaceClassName={step === "credentials" ? "grid place-items-center bg-muted/50 p-4 sm:p-8" : undefined}
      className={step === "credentials" ? "min-h-0 max-w-[26.875rem] rounded-[1.75rem] border border-border/80 px-5 pt-4! pb-6! shadow-overlay min-[480px]:px-8 md:min-h-0" : undefined}
    >
      {step !== "complete" ? (
        <AuthHeader
          onBack={() => {
            if (step === "verify") {
              setStep("credentials");
              return;
            }
            if (step === "profile") {
              setStep("verify");
              return;
            }
            goBack();
          }}
          title={step === "credentials" ? (
            <h1 id={EMAIL_SIGNUP_TITLE_ID} className="text-2xl font-bold tracking-[-0.04em] text-foreground">회원가입</h1>
          ) : undefined}
          end={step !== "credentials" ? (
            <span className="type-caption font-semibold text-muted-foreground">
              회원가입
            </span>
          ) : undefined}
        />
      ) : null}

      {step === "credentials" ? (
        <EmailCredentialsStep
          emailId={emailId}
          passwordId={passwordId}
          passwordConfirmId={passwordConfirmId}
          email={email}
          password={password}
          passwordConfirm={passwordConfirm}
          showPassword={showPassword}
          showPasswordConfirm={showPasswordConfirm}
          error={credentialsError}
          submitting={submittingCredentials}
          kakaoSignupHref={kakaoSignupHref}
          onEmailChange={(event) => setEmail(event.target.value)}
          onPasswordChange={(event) => setPassword(event.target.value)}
          onPasswordConfirmChange={(event) =>
            setPasswordConfirm(event.target.value)
          }
          onToggleShowPassword={() => setShowPassword((value) => !value)}
          onToggleShowPasswordConfirm={() =>
            setShowPasswordConfirm((value) => !value)
          }
          onSubmit={handleCredentialsSubmit}
        />
      ) : null}

      {step === "verify" ? (
        <EmailVerifyStep
          headingId={EMAIL_SIGNUP_TITLE_ID}
          email={email}
          onEditEmail={() => setStep("credentials")}
          codeLength={CODE_LENGTH}
          code={code}
          onCodeChange={setCode}
          onCodeComplete={(candidate) => void submitCode(candidate)}
          verifying={verifying}
          remainingLabel={
            remainingSeconds > 0
              ? `${formatRemaining(remainingSeconds)} 후에 다시 요청할 수 있어요.`
              : "인증번호가 만료되었어요. 다시 요청해주세요."
          }
          verifyError={verifyError}
          resending={resending}
          onResend={() => void handleResend()}
        />
      ) : null}

      {step === "profile" ? (
        <ProfileInfoStep
          headingId={EMAIL_SIGNUP_TITLE_ID}
          profilePhotoUrl={profilePhotoUrl}
          uploadingPhoto={uploadingPhoto}
          onPhotoSelect={(event) => void handlePhotoSelect(event)}
          travelStyleOptions={TRAVEL_STYLE_OPTIONS}
          selectedTravelStyles={travelStyles}
          onToggleTravelStyle={toggleTravelStyle}
          regionOptions={REGION_OPTIONS}
          selectedRegions={interestedRegions}
          onToggleRegion={toggleRegion}
          regionQuery={regionQuery}
          onRegionQueryChange={(event) => setRegionQuery(event.target.value)}
          error={profileError}
          submitting={savingProfile}
          onSubmit={() => void handleProfileSubmit()}
        />
      ) : null}

      {step === "complete" ? (
        <SignupCompleteStep
          headingId={EMAIL_SIGNUP_TITLE_ID}
          onLogin={() => router.push("/")}
          onGoHome={() => router.push("/")}
        />
      ) : null}
    </AuthShell>
  );
}

export { EmailSignupScreen, type EmailSignupScreenProps };
