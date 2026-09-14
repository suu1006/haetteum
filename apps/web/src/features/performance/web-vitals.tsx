"use client";

import { useReportWebVitals } from "next/web-vitals";
import { metricPayload } from "./metric-payload";

let sampled: boolean | undefined;
let landingPath: string | undefined;
const report: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  // Sample whole navigations, retaining the same sample for all their metrics.
  sampled ??= Math.random() < 0.1;
  landingPath ??= new URL(performance.getEntriesByType("navigation")[0]?.name ?? window.location.href).pathname;
  if (!sampled || process.env.NODE_ENV !== "production") return;
  const body = JSON.stringify(metricPayload(metric, landingPath));
  if (navigator.sendBeacon?.("/web-vitals", body)) return;
  void fetch("/web-vitals", { method: "POST", body, keepalive: true, credentials: "omit" }).catch(() => {});
};

export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
