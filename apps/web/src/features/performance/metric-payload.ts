export const metricRoutes = ["/", "/explore", "/login", "/signup", "/welcome", "/chat", "/trips", "/mypage", "/reviews", "/places/:id", "/festivals/:id", "/courses/:id", "/reels/place/:id", "other"] as const;

type Metric = { name: string; value: number; rating: string; id: string };
export function metricPayload(metric: Metric, pathname: string) {
  const path = pathname.split("?")[0];
  const route = metricRoutes.find(route => route === path) ??
    (["/places", "/festivals", "/courses", "/reels/place"].find(prefix => path.startsWith(`${prefix}/`))?.concat("/:id") ?? "other");
  return { name: metric.name, value: metric.value, rating: metric.rating, id: metric.id, route };
}
