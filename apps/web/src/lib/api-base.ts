export function normalizeApiBaseUrl(rawBaseUrl: string | undefined | null): string {
  return (rawBaseUrl ?? "").trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
}

export function getServerApiBaseUrl(): string {
  const privateApiBaseUrl = normalizeApiBaseUrl(process.env.API_BASE_URL);
  if (privateApiBaseUrl && privateApiBaseUrl !== "undefined") return privateApiBaseUrl;
  return getApiBaseUrl();
}
