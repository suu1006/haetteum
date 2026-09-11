import type { CoursePlace } from "./course-edit-model";

function distance(a: CoursePlace, b: CoursePlace) {
  const radians = Math.PI / 180;
  const lat1 = a.latitude! * radians;
  const lat2 = b.latitude! * radians;
  const h = Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin((b.longitude! - a.longitude!) * radians / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function courseDistance(places: readonly CoursePlace[]): number | null {
  if (places.some(p => p.latitude == null || p.longitude == null ||
    !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude))) return null;
  return places.slice(1).reduce((total, place, index) => total + distance(places[index]!, place), 0);
}

/** Fixed start; bounded 2-opt passes only accept strictly shorter straight-line routes. */
export function shortenCourse(places: readonly CoursePlace[]): CoursePlace[] | null {
  let bestDistance = courseDistance(places);
  if (places.length < 3 || bestDistance == null) return null;
  let best = [...places];
  let changed = false;
  for (let pass = 0; pass < 20; pass++) {
    let improved = false;
    for (let start = 1; start < best.length - 1; start++) {
      for (let end = start + 1; end < best.length; end++) {
        const candidate = [...best.slice(0, start), ...best.slice(start, end + 1).reverse(), ...best.slice(end + 1)];
        const nextDistance = courseDistance(candidate)!;
        if (nextDistance < bestDistance - 1) {
          best = candidate;
          bestDistance = nextDistance;
          improved = changed = true;
        }
      }
    }
    if (!improved) break;
  }
  return changed ? best : null;
}

function samePlace(a: CoursePlace, b: CoursePlace) {
  return a.id === b.id || (a.title.trim() === b.title.trim() &&
    a.latitude != null && b.latitude != null && a.longitude != null && b.longitude != null &&
    distance(a, b) < 100);
}

export function replaceCoursePlaces(
  places: readonly CoursePlace[],
  candidates: readonly CoursePlace[],
): CoursePlace[] | null {
  if (places.length < 2) return null;
  const fresh: CoursePlace[] = [];
  for (const candidate of candidates) {
    if (candidate.latitude == null || candidate.longitude == null) continue;
    if (![...places, ...fresh].some(place => samePlace(place, candidate))) fresh.push(candidate);
  }
  if (fresh.length === 0) return null;
  const next = [...places];
  // Keep the server-backed lookup anchor even if the user moved it after the start.
  const lookupAnchor = places.find(place => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(place.id));
  let replacement = 0;
  for (let index = 1; index < next.length && replacement < fresh.length; index++) {
    if (next[index] === lookupAnchor) continue;
    next[index] = fresh[replacement++]!;
  }
  return replacement > 0 ? next : null;
}
