export interface RankingPlaceCandidate {
  id: string;
  title: string;
  primaryImageUrl: string | null;
  imageCopyrightType: string | null;
}

export function normalizePlaceTitle(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export function buildPlaceCandidateIndex(
  places: RankingPlaceCandidate[],
): Map<string, RankingPlaceCandidate[]> {
  const candidateIndex = new Map<string, RankingPlaceCandidate[]>();

  for (const place of places) {
    const normalizedTitle = normalizePlaceTitle(place.title);
    const candidates = candidateIndex.get(normalizedTitle) ?? [];
    candidates.push(place);
    candidateIndex.set(normalizedTitle, candidates);
  }

  return candidateIndex;
}

export function httpsImageUrl(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";

  if (trimmed === "") return null;
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;

  return null;
}

export function formatRankingDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
