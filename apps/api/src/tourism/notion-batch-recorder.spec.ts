import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import type { ApiEnvironment } from "../config/environment.js";
import {
  NotionBatchRecorder,
  type NotionBatchResult,
} from "./notion-batch-recorder.js";

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

function result(overrides: Partial<NotionBatchResult> = {}): NotionBatchResult {
  return {
    batchName: "tourism-daily-sync",
    status: "SUCCEEDED",
    stage: "details",
    reason: null,
    startedAt,
    finishedAt,
    requestCount: 11,
    details: {
      requestedCount: 3,
      succeededCount: 3,
      failedCount: 0,
      remainingCount: 0,
    },
    ...overrides,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Notion batch recording", () => {
  it("maps a successful run to the verified schema and progress body", async () => {
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));

    await recorder().record(result());

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://api.notion.com/v1/pages");
    expect(options?.headers).toEqual({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      "Notion-Version": "2026-03-11",
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    const body = parseBody(options?.body);
    expect(body.parent).toEqual({
      type: "data_source_id",
      data_source_id: "test-source",
    });
    expect(body.properties).toMatchObject({
      상태: { status: { name: "성공" } },
      날짜: { date: { start: "2026-09-16T00:00:00.000Z" } },
      "필수 갱신 실패 건수": { number: 0 },
      "오류 요약": { rich_text: [] },
    });
    expect(body.properties.title.title[0]?.text.content).toBe(
      "TourAPI tourism-daily-sync — 성공",
    );
    expect(paragraph(body)).toBe(
      [
        "배치: tourism-daily-sync",
        "상태: SUCCEEDED",
        "단계: details",
        "사유 코드: 없음",
        "이번 실행 요청 수: 11",
        "상세 대상 수: 3",
        "상세 완료 수: 3",
        "상세 실패 수: 0",
        "상세 잔여 수: 0",
        "시작 (UTC): 2026-09-16T00:00:00.000Z",
        "종료 (UTC): 2026-09-16T00:01:00.000Z",
        "소요 시간: 60000 ms",
      ].join("\n"),
    );
  });

  it("records budget exhaustion as deferred with an allowlisted reason", async () => {
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));

    await recorder().record(
      result({
        status: "DEFERRED",
        reason: "TOUR_API_DAILY_LIMIT",
        requestCount: 700,
        details: {
          requestedCount: 200,
          succeededCount: 175,
          failedCount: 0,
          remainingCount: 25,
        },
      }),
    );

    const body = parseBody(fetch.mock.calls[0][1]?.body);
    expect(body.properties).toMatchObject({
      상태: { status: { name: "보류" } },
      "필수 갱신 실패 건수": { number: 0 },
      "오류 요약": {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "공용 일일 호출 한도에 도달해 보류했습니다. 다음 KST 날짜에 재개합니다.",
            },
          },
        ],
      },
    });
    expect(paragraph(body)).toContain("사유 코드: TOUR_API_DAILY_LIMIT");
    expect(paragraph(body)).toContain("상세 잔여 수: 25");
  });

  it("records detail failures as failed and never includes raw errors", async () => {
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));
    const input = result({
      status: "FAILED",
      reason: "DETAILS_FAILED",
      details: {
        requestedCount: 3,
        succeededCount: 1,
        failedCount: 2,
        remainingCount: 2,
      },
    }) as NotionBatchResult & { rawError: string };
    input.rawError =
      "https://example.test?serviceKey=private raw provider response";

    await recorder().record(input);

    const body = parseBody(fetch.mock.calls[0][1]?.body);
    expect(body.properties).toMatchObject({
      상태: { status: { name: "실패" } },
      "필수 갱신 실패 건수": { number: 2 },
      "오류 요약": {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "필수 상세 갱신 2건이 실패했습니다. 서버 로그를 확인하세요.",
            },
          },
        ],
      },
    });
    expect(JSON.stringify(body)).not.toContain("serviceKey");
    expect(JSON.stringify(body)).not.toContain("private");
    expect(JSON.stringify(body)).not.toContain("example.test");
  });

  it("keeps detail counts unknown when a list failure happens before measurement", async () => {
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));

    await recorder().record(
      result({
        batchName: "festival-daily-sync",
        status: "FAILED",
        stage: "list",
        reason: "LIST_FAILED",
        requestCount: 2,
        details: null,
      }),
    );

    const body = parseBody(fetch.mock.calls[0][1]?.body);
    expect(body.properties["필수 갱신 실패 건수"]).toEqual({ number: null });
    expect(paragraph(body)).toContain("상세 대상 수: 집계 불가");
    expect(paragraph(body)).toContain("상세 실패 수: 집계 불가");
    expect(paragraph(body)).toContain("상세 잔여 수: 집계 불가");
    expect(paragraph(body)).toContain("배치: festival-daily-sync");
  });

  it("replaces a runtime reason outside the allowlist with a safe code", async () => {
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));
    const unsafe = result({ status: "FAILED" }) as NotionBatchResult & {
      reason: string;
    };
    unsafe.reason = "secret serviceKey=private";

    await recorder().record(unsafe);

    const body = parseBody(fetch.mock.calls[0][1]?.body);
    expect(paragraph(body)).toContain("사유 코드: BATCH_FAILED");
    expect(JSON.stringify(body)).not.toContain("serviceKey");
    expect(JSON.stringify(body)).not.toContain("private");
  });

  it("does not send requests without configuration", async () => {
    const fetch = jest.spyOn(globalThis, "fetch");
    await recorder(false).record(result());
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["http", "network"])("isolates %s failures", async (failure) => {
    const fetch = jest.spyOn(globalThis, "fetch");
    if (failure === "http")
      fetch.mockResolvedValue(new Response("private error", { status: 403 }));
    else fetch.mockRejectedValue(new Error("private network error"));

    await expect(
      recorder().record(result({ status: "FAILED", reason: "LIST_FAILED" })),
    ).resolves.toBeUndefined();
  });
});

function parseBody(body: RequestInit["body"]) {
  if (typeof body !== "string") throw new Error("Expected JSON string body");
  return JSON.parse(body) as {
    parent: { type: string; data_source_id: string };
    properties: {
      [key: string]: unknown;
      title: { title: { text: { content: string } }[] };
    };
    children: Array<{
      paragraph: { rich_text: Array<{ text: { content: string } }> };
    }>;
  };
}

function paragraph(body: ReturnType<typeof parseBody>): string {
  return body.children[0]?.paragraph.rich_text[0]?.text.content ?? "";
}
