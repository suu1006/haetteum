import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import type { ApiEnvironment } from "../config/environment.js";
import { NotionBatchRecorder } from "./notion-batch-recorder.js";
import { TourismSyncScheduler } from "./tourism-sync.scheduler.js";

const startedAt = new Date("2026-09-16T00:00:00Z");
const finishedAt = new Date("2026-09-16T00:01:00Z");
function recorder(enabled = true) {
  return new NotionBatchRecorder(
    new ConfigService<ApiEnvironment, true>({
      NOTION_TOKEN: enabled ? "test-token" : undefined,
      NOTION_DATA_SOURCE_ID: enabled ? "test-source" : undefined,
    }),
  );
}
afterEach(() => {
  jest.restoreAllMocks();
});

describe("Notion batch recording", () => {
  it("creates a data source page with outcome and timestamps", async () => {
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));
    await recorder().record({ success: true, startedAt, finishedAt });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://api.notion.com/v1/pages");
    expect(options?.headers).toEqual({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      "Notion-Version": "2026-03-11",
    });
    const body = parseBody(options?.body);
    expect(body.parent).toEqual({
      type: "data_source_id",
      data_source_id: "test-source",
    });
    expect(body.properties.title.title[0].text.content).toContain("성공");
    expect(JSON.stringify(body.children)).toContain("2026-09-16T00:00:00.000Z");
    expect(JSON.stringify(body.children)).toContain("2026-09-16T00:01:00.000Z");
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it("does not send requests without configuration", async () => {
    const fetch = jest.spyOn(globalThis, "fetch");
    await recorder(false).record({ success: true, startedAt, finishedAt });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["http", "network"])("isolates %s failures", async (failure) => {
    const fetch = jest.spyOn(globalThis, "fetch");
    if (failure === "http")
      fetch.mockResolvedValue(new Response("private error", { status: 403 }));
    else fetch.mockRejectedValue(new Error("private network error"));
    await expect(
      recorder().record({ success: false, startedAt, finishedAt }),
    ).resolves.toBeUndefined();
  });
  it.each([true, false])(
    "records the actual scheduler outcome: success=%s",
    async (success) => {
      const fetch = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}"));
      const failure = new Error("batch failure");
      const scheduler = new TourismSyncScheduler(
        new ConfigService<ApiEnvironment, true>({ TOURISM_SYNC_ENABLED: true }),
        {
          incrementalSync: () =>
            success ? Promise.resolve() : Promise.reject(failure),
          enrichPendingPlaceDetails: () => Promise.resolve({ failedCount: 0 }),
        } as never,
        { batch: (work: () => Promise<unknown>) => work() } as never,
        recorder(),
      );
      if (success)
        await expect(scheduler.runDailySync()).resolves.toBeUndefined();
      else await expect(scheduler.runDailySync()).rejects.toBe(failure);
      expect(fetch).toHaveBeenCalledTimes(1);
      const body = parseBody(fetch.mock.calls[0][1]?.body);
      expect(body.properties.title.title[0].text.content).toContain(
        success ? "성공" : "실패",
      );
    },
  );
});

function parseBody(body: RequestInit["body"]) {
  if (typeof body !== "string") throw new Error("Expected JSON string body");
  return JSON.parse(body) as {
    parent: { type: string; data_source_id: string };
    properties: { title: { title: { text: { content: string } }[] } };
    children: unknown[];
  };
}
