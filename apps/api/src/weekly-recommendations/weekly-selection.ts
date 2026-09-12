import { createHash } from "node:crypto";

const DAY = 86_400_000;
export function recommendationWeek(now: Date, next = false): string {
  const local = new Date(now.getTime() + 9 * 3_600_000);
  local.setUTCDate(
    local.getUTCDate() - ((local.getUTCDay() + 6) % 7) + (next ? 7 : 0),
  );
  return local.toISOString().slice(0, 10);
}
export function weekDate(week: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new Error("INVALID_WEEK");
  const date = new Date(`${week}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== week ||
    date.getUTCDay() !== 1
  )
    throw new Error("INVALID_WEEK");
  return date;
}
export function placeKind(category: string | null): string {
  // KTO digital tourism content guide: NA=자연관광, HS=역사관광, VE=문화관광.
  // https://touraz.kr/publicTenderList/publicTenderView?bbsSeq=647518&tabMode=ktoip
  // category1 stores lclsSystm1, so legacy cat1 codes are not interchangeable.
  const code = category?.trim();
  if (code === "NA") return "nature";
  if (code === "HS" || code === "VE") return "culture";
  return "unknown";
}
export type SelectionPlace = {
  id: string;
  region: string;
  kind: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
};
export function balancedSelection<T extends SelectionPlace>(
  items: readonly T[],
  week: string,
  limit: number,
  recent = new Set<string>(),
): T[] {
  const pool = [...new Map(items.map((p) => [p.id, p])).values()]
    .filter((p) => !recent.has(p.id))
    .map((place) => ({
      place,
      hash: createHash("sha256").update(`${week}:${place.id}`).digest("hex"),
    }))
    .sort(
      (a, b) =>
        a.hash.localeCompare(b.hash) || a.place.id.localeCompare(b.place.id),
    );
  const selected: T[] = [];
  const regions = new Map<string, number>();
  const kinds = new Map<string, number>();
  const identities = new Set<string>();
  // Hash each candidate once. Scan for the next least-represented bucket instead
  // of repeatedly sorting the national population for every recommendation.
  while (selected.length < limit) {
    let best = -1;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i].place;
      if (
        identities.has(placeIdentity(p)) ||
        (regions.get(p.region) ?? 0) >= Math.ceil(limit / 5) ||
        (kinds.get(p.kind) ?? 0) >= Math.ceil(limit / 2)
      )
        continue;
      if (best < 0) {
        best = i;
        continue;
      }
      const previous = pool[best].place;
      const regionDifference =
        (regions.get(p.region) ?? 0) - (regions.get(previous.region) ?? 0);
      if (
        regionDifference < 0 ||
        (regionDifference === 0 &&
          (kinds.get(p.kind) ?? 0) < (kinds.get(previous.kind) ?? 0))
      )
        best = i;
    }
    if (best < 0) break;
    const p = pool.splice(best, 1)[0].place;
    selected.push(p);
    identities.add(placeIdentity(p));
    regions.set(p.region, (regions.get(p.region) ?? 0) + 1);
    kinds.set(p.kind, (kinds.get(p.kind) ?? 0) + 1);
  }
  return selected;
}
export function placeIdentity(p: SelectionPlace): string {
  return `${p.title.replace(/\s/g, "")}:${p.latitude?.toFixed(3)}:${p.longitude?.toFixed(3)}`;
}
export function validComposition(
  items: readonly SelectionPlace[],
  count = 20,
): boolean {
  return (
    items.length >= count &&
    new Set(items.map((p) => p.region)).size >= 5 &&
    new Set(items.map((p) => p.kind)).size >= 2
  );
}
export function visitAvailability(
  rest: string,
  season: string,
  week: string,
): "OPEN" | "CLOSED" | "UNKNOWN" {
  // Only explicit structured date windows and unambiguous full closure are exclusion rules.
  const dates = season.match(
    /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\s*[~～–-]\s*(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/,
  );
  if (dates) {
    const start = Date.UTC(+dates[1], +dates[2] - 1, +dates[3]);
    const end = Date.UTC(+dates[4], +dates[5] - 1, +dates[6]);
    const monday = weekDate(week).getTime();
    if (end < monday || start > monday + 6 * DAY) return "CLOSED";
  }
  if (
    /^(임시\s*휴업|임시\s*휴관|폐업|폐관|운영\s*중단|상시\s*휴무)[.!\s]*$/.test(
      rest.trim(),
    )
  )
    return "CLOSED";
  return /연중무휴/.test(rest) ? "OPEN" : "UNKNOWN";
}
