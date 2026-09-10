import type { Metadata } from "next";
import { headers } from "next/headers";

import { EmailSignupScreen } from "@/components/patterns/email-signup-screen";
import { hasSameOriginReferrer, kakaoLoginHref } from "@/app/login/page";

export const metadata: Metadata = {
  title: "회원가입 | 해뜸",
  description: "이메일로 해뜸에 가입하고 여행 기록을 시작하세요.",
};

export default async function SignupPage() {
  const requestHeaders = await headers();

  return (
    <EmailSignupScreen
      canGoBack={hasSameOriginReferrer(requestHeaders)}
      kakaoSignupHref={kakaoLoginHref("/")}
    />
  );
}
