import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnvironment } from "../config/environment.js";
import type { DetailEnrichmentSummary } from "./detail-enrichment-summary.js";
import type { TourApiDeferredReason } from "./tour-api-policy.js";

export type NotionBatchStatus = "SUCCEEDED" | "FAILED" | "DEFERRED";
export type NotionBatchStage = "list" | "details";
export type NotionBatchReason =
  TourApiDeferredReason | "LIST_FAILED" | "DETAILS_FAILED";
export type NotionBatchResult = {
  batchName: "tourism-daily-sync" | "festival-daily-sync";
  status: NotionBatchStatus;
  stage: NotionBatchStage;
  reason: NotionBatchReason | null;
  startedAt: Date;
  finishedAt: Date;
  requestCount: number;
  details: Pick<
    DetailEnrichmentSummary,
    | "requestedCount"
    | "succeededCount"
    | "failedCount"
    | "remainingCount"
    | "waitingCount"
    | "quarantinedCount"
    | "locallyReplayedCount"
    | "deferredReason"
  > | null;
};

const NOTION_STATUS: Record<NotionBatchStatus, string> = {
  SUCCEEDED: "성공",
  FAILED: "실패",
  DEFERRED: "보류",
};

@Injectable()
export class NotionBatchRecorder {
  private readonly logger = new Logger(NotionBatchRecorder.name);
  constructor(private readonly config: ConfigService<ApiEnvironment, true>) {}
  async record(result: NotionBatchResult): Promise<void> {
    const token = this.config.get("NOTION_TOKEN", { infer: true });
    const dataSourceId = this.config.get("NOTION_DATA_SOURCE_ID", {
      infer: true,
    });
    if (!token || !dataSourceId) return;

    try {
      const statusName = NOTION_STATUS[result.status] ?? "실패";
      const reason = safeReason(result.reason, result.status);
      const errorSummary = summarize(result, reason);
      const detailCount = (value: number | undefined): string | number =>
        value ?? "집계 불가";
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
            상태: { status: { name: statusName } },
            날짜: { date: { start: result.startedAt.toISOString() } },
            "필수 갱신 실패 건수": {
              number: result.details?.failedCount ?? null,
            },
            "오류 요약": {
              rich_text:
                errorSummary === null
                  ? []
                  : [
                      {
                        type: "text",
                        text: { content: errorSummary },
                      },
                    ],
            },
            title: {
              title: [
                {
                  type: "text",
                  text: {
                    content: `TourAPI ${result.batchName} — ${statusName}`,
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
                        `배치: ${result.batchName}`,
                        `상태: ${result.status}`,
                        `단계: ${result.stage}`,
                        `사유 코드: ${reason ?? "없음"}`,
                        `상세 중단 사유: ${result.details?.deferredReason ? safeReason(result.details.deferredReason, "DEFERRED") : "없음"}`,
                        `이번 실행 요청 수: ${result.requestCount}`,
                        `상세 대상 수: ${detailCount(result.details?.requestedCount)}`,
                        `상세 완료 수: ${detailCount(result.details?.succeededCount)}`,
                        `상세 실패 수: ${detailCount(result.details?.failedCount)}`,
                        `상세 잔여 수: ${detailCount(result.details?.remainingCount)}`,
                        `복구 대기 수: ${detailCount(result.details?.waitingCount)}`,
                        `격리 수: ${detailCount(result.details?.quarantinedCount)}`,
                        `이번 실행 저장 응답만으로 복구 완료 수: ${detailCount(result.details?.locallyReplayedCount)}`,
                        `목록 상태: ${result.stage === "details" ? "완료" : "미완료"}`,
                        `시작 (UTC): ${result.startedAt.toISOString()}`,
                        `종료 (UTC): ${result.finishedAt.toISOString()}`,
                        `소요 시간: ${result.finishedAt.getTime() - result.startedAt.getTime()} ms`,
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

type SafeReason = NotionBatchReason | "BATCH_FAILED";

function safeReason(
  reason: unknown,
  status: NotionBatchStatus,
): SafeReason | null {
  if (status === "SUCCEEDED") return null;
  switch (reason) {
    case "TOUR_API_DAILY_LIMIT":
    case "TOUR_API_JOB_DAILY_LIMIT":
    case "TOUR_API_RECOVERY_WAIT":
    case "TOUR_API_RETRY_DAILY_LIMIT":
    case "TOUR_API_PROVIDER_COOLDOWN":
    case "TOUR_API_BATCH_DEADLINE":
    case "LIST_FAILED":
    case "DETAILS_FAILED":
      return reason;
    default:
      return "BATCH_FAILED";
  }
}

function summarize(
  result: NotionBatchResult,
  reason: SafeReason | null,
): string | null {
  if (result.status === "SUCCEEDED") return null;
  if (result.status === "DEFERRED") {
    if (reason === "TOUR_API_DAILY_LIMIT")
      return "공용 일일 잔여 호출 예산이 부족해 보류했습니다. 다음 KST 날짜에 재개합니다.";
    if (reason === "TOUR_API_JOB_DAILY_LIMIT")
      return "배치별 일일 잔여 호출 예산이 부족해 보류했습니다. 다음 KST 날짜에 재개합니다.";
    if (reason === "TOUR_API_RECOVERY_WAIT")
      return "복구 대기 또는 격리된 상세가 남아 있습니다. 재시도 시각과 격리 상태를 확인하세요.";
    if (reason === "TOUR_API_RETRY_DAILY_LIMIT")
      return "복구 일일 잔여 호출 예산이 부족해 보류했습니다. 다음 KST 날짜에 재개합니다.";
    if (reason === "TOUR_API_PROVIDER_COOLDOWN")
      return "제공자 대기 시간으로 HTTP 수집을 보류했습니다. 저장 응답의 로컬 복구는 가능합니다.";
    if (reason === "TOUR_API_BATCH_DEADLINE")
      return "배치 실행 시간 상한으로 보류했습니다. 다음 실행에서 이어갑니다.";
    return "배치를 보류했습니다. 안전한 사유 코드를 확인하세요.";
  }
  if (reason === "DETAILS_FAILED") {
    if (result.details && result.details.failedCount > 0)
      return `목록 완료 / ${result.details.succeededCount > 0 ? "상세 일부 실패" : "상세 실패"}: 완료 ${result.details.succeededCount}건은 유지했고, 이번 실행 ${result.details.failedCount}건이 실패했습니다. 복구 조회 명령으로 확인하세요.`;
    return "필수 상세 갱신이 중단됐습니다. 서버 로그를 확인하세요.";
  }
  if (reason === "LIST_FAILED")
    return "목록 수집 또는 배치 준비가 중단됐습니다. 서버 로그를 확인하세요.";
  return "배치 실행이 중단됐습니다. 서버 로그를 확인하세요.";
}
