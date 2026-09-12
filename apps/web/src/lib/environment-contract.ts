import { getApiBaseUrl } from "@/lib/api-base";

export const publicWebEnvKeys = {
  apiBaseUrl: "NEXT_PUBLIC_API_BASE_URL",
  kakaoJsKey: "NEXT_PUBLIC_KAKAO_JS_KEY",
  weeklyThumbnailBaseUrl: "NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL",
} as const;

export type PublicWebEnvironment = {
  apiBaseUrl: string;
  kakaoJsKey: string | null;
  weeklyThumbnailBaseUrl: string | null;
};

export type PublicWebEnvironmentContract = {
  apiBaseUrl: {
    required: true;
    value: string | null;
    valid: boolean;
    purpose: "브라우저/서버 공용 API 호출의 base URL";
  };
  kakaoJsKey: {
    required: false;
    value: string | null;
    valid: boolean;
    purpose: "지도 기능에서 Kakao Maps JS SDK 로딩용 공개 키";
  };
  weeklyThumbnailBaseUrl: {
    required: false;
    value: string | null;
    valid: boolean;
    purpose: "주간 추천 사전 생성 썸네일의 최적화 우회 허용 경로";
  };
};

function isValidHttpUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

function toNullableString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.toLowerCase() !== "undefined" ? normalized : null;
}

// Keep public env reads static so Next.js can inline them into browser bundles.
function getKakaoJsKeyRaw(): string | null {
  return toNullableString(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
}

function getWeeklyThumbnailBaseUrlRaw(): string | null {
  return toNullableString(process.env.NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL);
}

export function getPublicWebEnvironment(): PublicWebEnvironment {
  return {
    apiBaseUrl: getApiBaseUrl(),
    kakaoJsKey: getKakaoJsKeyRaw(),
    weeklyThumbnailBaseUrl: getWeeklyThumbnailBaseUrlRaw(),
  };
}

export function validatePublicWebEnvironment() {
  const { apiBaseUrl } = getPublicWebEnvironment();
  const kakaoJsKey = getKakaoJsKeyRaw();
  const weeklyThumbnailBaseUrl = getWeeklyThumbnailBaseUrlRaw();

  const apiBaseUrlValid = Boolean(apiBaseUrl && isValidHttpUrl(apiBaseUrl));

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!apiBaseUrl) {
    errors.push("NEXT_PUBLIC_API_BASE_URL is required. Set it in apps/web/.env.local.");
  } else if (!apiBaseUrlValid) {
    errors.push("NEXT_PUBLIC_API_BASE_URL must be a valid http(s) URL.");
  }

  if (!kakaoJsKey) {
    warnings.push(
      "NEXT_PUBLIC_KAKAO_JS_KEY is not set. Kakao Maps JS SDK requires this key to display maps.",
    );
  }

  if (!weeklyThumbnailBaseUrl) {
    warnings.push(
      "NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL is not set. Weekly thumbnail optimization bypass is disabled.",
    );
  } else if (!isValidHttpUrl(weeklyThumbnailBaseUrl)) {
    warnings.push(
      "NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL is set but invalid. Weekly thumbnail optimization bypass is disabled.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    contract: {
      apiBaseUrl: {
        required: true,
        value: apiBaseUrl,
        valid: apiBaseUrlValid,
        purpose: "브라우저/서버 공용 API 호출의 base URL",
      },
      kakaoJsKey: {
        required: false,
        value: kakaoJsKey,
        valid: Boolean(kakaoJsKey),
        purpose: "지도 기능에서 Kakao Maps JS SDK 로딩용 공개 키",
      },
      weeklyThumbnailBaseUrl: {
        required: false,
        value: weeklyThumbnailBaseUrl,
        valid: !weeklyThumbnailBaseUrl || isValidHttpUrl(weeklyThumbnailBaseUrl),
        purpose: "주간 추천 사전 생성 썸네일의 최적화 우회 허용 경로",
      },
    } as PublicWebEnvironmentContract,
  };
}

export function logPublicWebEnvironmentStatus() {
  const result = validatePublicWebEnvironment();

  for (const warning of result.warnings) {
    console.warn(`[env] ${warning}`);
  }

  if (!result.valid) {
    for (const error of result.errors) {
      console.error(`[env] ${error}`);
    }
  }

  return result;
}

export function getKakaoJsKey(): string | null {
  return getKakaoJsKeyRaw();
}

export function getWeeklyThumbnailBaseUrl(): string | null {
  return getWeeklyThumbnailBaseUrlRaw();
}
