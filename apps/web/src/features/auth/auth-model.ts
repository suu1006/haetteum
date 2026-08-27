export type AuthUser = {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
};

export type AuthState =
  | { status: "unknown"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: AuthUser };

const loginErrors = {
  cancelled: "카카오 로그인이 취소되었어요. 다시 시도해 주세요.",
  invalid_request: "로그인 요청을 확인할 수 없어요. 다시 시도해 주세요.",
  provider_unavailable:
    "카카오 로그인에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
} as const;

const encodedAsciiControlPattern = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;

function containsAsciiControl(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function safeReturnTo(value: string | string[] | undefined): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    containsAsciiControl(value) ||
    encodedAsciiControlPattern.test(value)
  ) {
    return "/";
  }

  return value;
}

export function loginErrorMessage(value: string | undefined): string | null {
  if (value === "cancelled") return loginErrors.cancelled;
  if (value === "invalid_request") return loginErrors.invalid_request;
  if (value === "provider_unavailable") {
    return loginErrors.provider_unavailable;
  }
  return null;
}
