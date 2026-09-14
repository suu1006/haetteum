import { z } from "zod";
import { metricRoutes } from "@/features/performance/metric-payload";

const metricSchema = z.object({
  name: z.enum(["TTFB", "FCP", "LCP", "INP", "CLS"]),
  value: z.number().finite().min(0).max(86_400_000),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  id: z.string().regex(/^[\w.-]{1,100}$/),
  route: z.enum(metricRoutes),
}).strict();

export async function POST(request: Request) {
  // Beacons use text/plain. Reject cross-site writes and bound the streamed body.
  if (request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let size = 0;
  let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const result = metricSchema.safeParse(JSON.parse(text));
    if (!result.success) return new Response(null, { status: 400 });
    // Structured stdout is collected by the existing PM2 log pipeline.
    console.info(JSON.stringify({ event: "web-vital", ...result.data }));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 400 });
  } finally {
    reader.releaseLock();
  }
}
