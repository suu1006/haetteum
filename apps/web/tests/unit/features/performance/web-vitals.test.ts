import { describe, expect, it } from "vitest";
import { metricPayload } from "@/features/performance/metric-payload";

describe("metricPayload", () => {
  it("sends only aggregate route names, never queries, record ids, or entries", () => {
    const payload = metricPayload({ name: "LCP", value: 1234, rating: "good", id: "v1-123" }, "/places/private-record?q=secret");
    expect(payload).toEqual({ name: "LCP", value: 1234, rating: "good", id: "v1-123", route: "/places/:id" });
    expect(metricPayload({ name: "CLS", value: 0, rating: "good", id: "v1-123" }, "/unknown/secret").route).toBe("other");
  });
});

it("accepts bounded metrics and rejects private fields, oversized input, and cross-site writes", async () => {
  const { POST } = await import("@/app/web-vitals/route");
  const { vi } = await import("vitest");
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const payload = { name: "CLS", value: 0.01, rating: "good", id: "v1-123", route: "/explore" };
  const request = (body: string, headers?: HeadersInit) => new Request("https://haetteum.kr/web-vitals", { method: "POST", body, headers });
  try {
    expect((await POST(request(JSON.stringify(payload)))).status).toBe(204);
    expect((await POST(request(JSON.stringify({ ...payload, email: "private" })))).status).toBe(400);
    expect((await POST(request("x".repeat(2049)))).status).toBe(413);
    expect((await POST(request(JSON.stringify(payload), { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect(log).toHaveBeenCalledTimes(1);
  } finally { log.mockRestore(); }
});
