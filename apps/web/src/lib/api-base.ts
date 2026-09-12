export function normalizeApiBaseUrl(rawBaseUrl: string | undefined | null): string {
  return (rawBaseUrl ?? "").trim().replace(/\/+$/, "");
}

/**
 * Joins a base URL and a path into a single URL, ensuring exactly one slash
 * at the seam regardless of whether the base has a trailing slash or the
 * path has a leading slash.
 */
export function joinApiUrl(baseUrl: string, path: string): string {
  const normalizedBase = normalizeApiBaseUrl(baseUrl);
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
}

export function getServerApiBaseUrl(): string {
  const privateApiBaseUrl = normalizeApiBaseUrl(process.env.API_BASE_URL);
  if (privateApiBaseUrl && privateApiBaseUrl !== "undefined") return privateApiBaseUrl;
  return getApiBaseUrl();
}
