import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnvironment } from "../config/environment.js";

@Injectable()
export class NotionBatchRecorder {
  private readonly logger = new Logger(NotionBatchRecorder.name);
  constructor(private readonly config: ConfigService<ApiEnvironment, true>) {}
  async record(result: {
    success: boolean;
    startedAt: Date;
    finishedAt: Date;
    failedCount?: number | null;
    failureStage?: "list" | "details";
  }): Promise<void> {
    const token = this.config.get("NOTION_TOKEN", { infer: true });
    const dataSourceId = this.config.get("NOTION_DATA_SOURCE_ID", {
      infer: true,
    });
    if (!token || !dataSourceId) return;

    try {
      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2026-03-11",
        },
        body: JSON.stringify({
          parent: { type: "data_source_id", data_source_id: dataSourceId },
          properties: {
            상태: { status: { name: result.success ? "성공" : "실패" } },
            날짜: { date: { start: result.startedAt.toISOString() } },
            "필수 갱신 실패 건수": {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: String(
                      result.failedCount ?? (result.success ? 0 : "집계 불가"),
                    ),
                  },
                },
              ],
            },
            "오류 요약": {
              rich_text: result.success
                ? []
                : [
                    {
                      type: "text",
                      text: {
                        content:
                          result.failedCount != null && result.failedCount > 0
                            ? `필수 상세 갱신 ${result.failedCount}건 실패. 서버 로그를 확인하세요.`
                            : `${result.failureStage === "details" ? "필수 상세 갱신" : "목록 수집 또는 배치 준비"} 중단. 실패 건수 집계 불가. 서버 로그를 확인하세요.`,
                      },
                    },
                  ],
            },
            title: {
              title: [
                {
                  type: "text",
                  text: {
                    content: `TourAPI 배치 실행 — ${result.success ? "성공" : "실패"}`,
                  },
                },
              ],
            },
          },
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: [
                        "배치: tourism-daily-sync",
                        `시작 (UTC): ${result.startedAt.toISOString()}`,
                        `종료 (UTC): ${result.finishedAt.toISOString()}`,
                        `소요 시간: ${result.finishedAt.getTime() - result.startedAt.getTime()} ms`,
                        ...(result.success
                          ? []
                          : [
                              "실패 상세는 서버의 [BATCH_FAILED] tour-api-sync 로그에서 확인하세요.",
                            ]),
                      ].join("\n"),
                    },
                  },
                ],
              },
            },
          ],
        }),
      });
      // 응답 본문과 예외 원문에는 민감한 정보가 포함될 수 있으므로 기록하지 않는다.
      if (!response.ok)
        this.logger.warn(
          `[NOTION_BATCH_RECORD_FAILED] HTTP ${response.status}`,
        );
      await response.body?.cancel();
    } catch {
      this.logger.warn(
        "[NOTION_BATCH_RECORD_FAILED] Request failed or timed out",
      );
    }
  }
}
