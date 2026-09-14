export function homepageUrl(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const anchorMatch = text.match(/href\s*=\s*["']([^"']+)["']/iu);
  const bareUrlMatch = text.match(/https?:\/\/\S+/iu);
  const candidate = anchorMatch?.[1]?.trim() ?? bareUrlMatch?.[0] ?? text;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
