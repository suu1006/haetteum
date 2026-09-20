import { TourApiRecovery } from "./tour-api-recovery.js";
import { Inject, Injectable } from "@nestjs/common";
import { TourApiPolicy, TourApiPolicyError } from "./tour-api-policy.js";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

import type { ApiEnvironment } from "../config/environment.js";
import {
  tourApiChangedPlaceSchema,
  tourApiDistrictSchema,
  tourApiCourseIntroSchema,
  tourApiCourseStopSchema,
  tourApiFestivalIntroSchema,
  tourApiFestivalSchema,
  tourApiHeaderSchema,
  tourApiPlaceImageSchema,
  tourApiPlaceInfoSchema,
  tourApiPlaceIntroSchema,
  tourApiPageSchema,
  tourApiPlaceDetailSchema,
  tourApiPlaceSchema,
} from "./tour-api.schemas.js";
import type {
  CourseApiPort,
  TourApiChangedPlace,
  TourApiCourseIntro,
  TourApiCourseStop,
  TourApiDistrict,
  TourApiFestival,
  TourApiFestivalIntro,
  TourApiFetch,
  FestivalApiPort,
  TourApiPage,
  TourApiPlace,
  TourApiPlaceImage,
  TourApiPlaceInfo,
  TourApiPlaceIntro,
  TourApiPlaceDetail,
  TourApiPort,
  TourApiSleep,
} from "./tour-api.types.js";
import { TOUR_API_FETCH, TOUR_API_SLEEP } from "./tourism.constants.js";

const REQUEST_TIMEOUT_MS = 20_000;
const RETRY_DELAYS_MS = [2_000, 10_000] as const;
const BODY_LIMIT = 2 * 1024 * 1024;

type RequestOptions<T extends z.ZodTypeAny> = {
  operation: string;
  pageNo: number;
  numOfRows?: number;
  itemSchema: T;
  parameters?: Readonly<Record<string, string>>;
};

export class TourApiError extends Error {
  constructor(
    readonly operation: string,
    readonly providerCode: string,
    readonly httpStatus?: number,
    public retryAfterMs = 0,
  ) {
    super(`TourAPI ${operation} failed (${providerCode})`);
    this.name = "TourApiError";
  }
}

@Injectable()
export class TourApiClient
  implements TourApiPort, FestivalApiPort, CourseApiPort
{
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(TOUR_API_FETCH) private readonly fetch: TourApiFetch,
    @Inject(TOUR_API_SLEEP) private readonly sleep: TourApiSleep,
    private readonly policy: TourApiPolicy,
    private readonly recovery: TourApiRecovery,
  ) {}

  getDistrictPage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiDistrict>> {
    return this.request({
      operation: "ldongCode2",
      pageNo: input.pageNo,
      itemSchema: tourApiDistrictSchema,
      parameters: {
        lDongRegnCd: input.regionCode,
        lDongListYn: "Y",
      },
    });
  }

  getPlacePage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiPlace>> {
    return this.request({
      operation: "areaBasedList2",
      pageNo: input.pageNo,
      itemSchema: tourApiPlaceSchema,
      parameters: {
        contentTypeId: "12",
        lDongRegnCd: input.regionCode,
        arrange: "C",
      },
    });
  }

  getFestivalPage(input: {
    eventStartDate: string;
    eventEndDate: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiFestival>> {
    return this.request({
      operation: "searchFestival2",
      pageNo: input.pageNo,
      itemSchema: tourApiFestivalSchema,
      parameters: {
        eventStartDate: input.eventStartDate,
        eventEndDate: input.eventEndDate,
        lclsSystm1: "EV",
        lclsSystm2: "EV01",
        arrange: "C",
      },
    });
  }

  getCoursePage(input: { pageNo: number }): Promise<TourApiPage<TourApiPlace>> {
    return this.request({
      operation: "areaBasedList2",
      pageNo: input.pageNo,
      itemSchema: tourApiPlaceSchema,
      parameters: {
        contentTypeId: "25",
        arrange: "C",
      },
    });
  }

  async getCourseCommonDetail(contentId: string): Promise<TourApiPlaceDetail> {
    const page = await this.request({
      operation: "detailCommon2",
      pageNo: 1,
      numOfRows: 1,
      itemSchema: tourApiPlaceDetailSchema,
      parameters: { contentId },
    });
    const detail = page.items[0];
    if (detail == null) {
      throw new TourApiError("detailCommon2", "EMPTY_RESPONSE");
    }
    return detail;
  }

  async getCourseIntro(contentId: string): Promise<TourApiCourseIntro> {
    const page = await this.request({
      operation: "detailIntro2",
      pageNo: 1,
      numOfRows: 1,
      itemSchema: tourApiCourseIntroSchema,
      parameters: { contentId, contentTypeId: "25" },
    });
    const intro = page.items[0];
    if (intro == null) {
      throw new TourApiError("detailIntro2", "EMPTY_RESPONSE");
    }
    return intro;
  }

  async getCourseStops(
    contentId: string,
  ): Promise<readonly TourApiCourseStop[]> {
    const page = await this.request({
      operation: "detailInfo2",
      pageNo: 1,
      numOfRows: 50,
      itemSchema: tourApiCourseStopSchema,
      parameters: { contentId, contentTypeId: "25" },
    });
    return page.items;
  }

  getChangedPlacePage(input: {
    regionCode: string;
    modifiedDate: string;
    showflag: "0" | "1";
    pageNo: number;
  }): Promise<TourApiPage<TourApiChangedPlace>> {
    return this.request({
      operation: "areaBasedSyncList2",
      pageNo: input.pageNo,
      itemSchema: tourApiChangedPlaceSchema,
      parameters: {
        contentTypeId: "12",
        lDongRegnCd: input.regionCode,
        modifiedtime: input.modifiedDate,
        showflag: input.showflag,
        arrange: "C",
      },
    });
  }

  getChangedPlaceProbePage(input: {
    regionCode: string;
    showflag: "0" | "1";
    pageNo: number;
  }): Promise<TourApiPage<TourApiChangedPlace>> {
    return this.request({
      operation: "areaBasedSyncList2",
      pageNo: input.pageNo,
      itemSchema: tourApiChangedPlaceSchema,
      parameters: {
        contentTypeId: "12",
        lDongRegnCd: input.regionCode,
        showflag: input.showflag,
        arrange: "C",
      },
    });
  }

  async getPlaceCommonDetail(contentId: string): Promise<TourApiPlaceDetail> {
    const page = await this.request({
      operation: "detailCommon2",
      pageNo: 1,
      numOfRows: 1,
      itemSchema: tourApiPlaceDetailSchema,
      parameters: { contentId },
    });
    const detail = page.items[0];

    if (detail == null) {
      throw new TourApiError("detailCommon2", "EMPTY_RESPONSE");
    }

    return detail;
  }

  async getPlaceIntro(contentId: string): Promise<TourApiPlaceIntro> {
    const page = await this.request({
      operation: "detailIntro2",
      pageNo: 1,
      numOfRows: 1,
      itemSchema: tourApiPlaceIntroSchema,
      parameters: { contentId, contentTypeId: "12" },
    });
    const intro = page.items[0];
    if (intro == null) {
      throw new TourApiError("detailIntro2", "EMPTY_RESPONSE");
    }
    return intro;
  }

  async getFestivalIntro(contentId: string): Promise<TourApiFestivalIntro> {
    const page = await this.request({
      operation: "detailIntro2",
      pageNo: 1,
      numOfRows: 1,
      itemSchema: tourApiFestivalIntroSchema,
      parameters: { contentId, contentTypeId: "15" },
    });
    const intro = page.items[0];
    if (intro == null) {
      throw new TourApiError("detailIntro2", "EMPTY_RESPONSE");
    }
    return intro;
  }

  async getPlaceRepeatInfo(
    contentId: string,
  ): Promise<readonly TourApiPlaceInfo[]> {
    const page = await this.request({
      operation: "detailInfo2",
      pageNo: 1,
      itemSchema: tourApiPlaceInfoSchema,
      parameters: { contentId, contentTypeId: "12" },
    });
    return page.items;
  }

  async getPlaceImages(
    contentId: string,
  ): Promise<readonly TourApiPlaceImage[]> {
    const page = await this.request({
      operation: "detailImage2",
      pageNo: 1,
      itemSchema: tourApiPlaceImageSchema,
      parameters: {
        contentId,
        imageYN: "Y",
      },
    });
    return page.items;
  }

  async searchPlaceByKeyword(input: {
    keyword: string;
    areaCode?: string;
  }): Promise<TourApiPlace | null> {
    const candidates = await this.searchPlaceCandidates(input);
    return pickImageBearingPlace(candidates) ?? candidates[0] ?? null;
  }

  /**
   * searchKeyword2 원본 결과를 그대로 돌려준다(이미지 보유 데이터 우선 정렬).
   * 지역 조건이 있는데 결과가 없으면 전국 조건으로 1회 재시도한다.
   * 이름 연관성 판단은 호출자(랭킹 매칭 로직)가 담당한다.
   */
  async searchPlaceCandidates(input: {
    keyword: string;
    areaCode?: string;
  }): Promise<readonly TourApiPlace[]> {
    const keyword = input.keyword.trim();

    if (keyword === "") return [];

    const withArea = await this.runKeywordSearch(keyword, input.areaCode);

    if (withArea.length > 0 || input.areaCode === undefined) {
      return withArea;
    }

    return this.runKeywordSearch(keyword, undefined);
  }

  private async runKeywordSearch(
    keyword: string,
    areaCode: string | undefined,
  ): Promise<readonly TourApiPlace[]> {
    const page = await this.request({
      operation: "searchKeyword2",
      pageNo: 1,
      numOfRows: 20,
      itemSchema: tourApiPlaceSchema,
      parameters: {
        keyword,
        arrange: "O",
        ...(areaCode === undefined ? {} : { areaCode }),
      },
    });
    return page.items;
  }

  private async request<T extends z.ZodTypeAny>(
    options: RequestOptions<T>,
  ): Promise<TourApiPage<z.output<T>>> {
    return this.recovery.requestScope(() => this.requestInScope(options));
  }

  private async requestInScope<T extends z.ZodTypeAny>(
    options: RequestOptions<T>,
  ): Promise<TourApiPage<z.output<T>>> {
    this.recovery.stage(options.operation);
    const parameters = {
      ...options.parameters,
      pageNo: String(options.pageNo),
      numOfRows: String(options.numOfRows ?? 100),
    };
    const captured = await this.recovery.replay(options.operation, parameters);
    if (captured)
      return this.parseCaptured(captured.body, captured.httpStatus, options);
    const url = this.buildUrl(options);

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        this.recovery.beforeRequest();
        return await this.policy.request(
          async () => {
            this.recovery.requestReserved();
            try {
              return await this.requestOnce(url, options);
            } catch (error) {
              if (error instanceof TourApiPolicyError) throw error;
              const failure = this.sanitizeError(error, options.operation);
              const auth =
                [
                  "20",
                  "30",
                  "31",
                  "SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
                ].includes(failure.providerCode) ||
                [401, 403].includes(failure.httpStatus ?? 0);
              if (
                auth ||
                failure.providerCode === "22" ||
                failure.retryAfterMs > 60_000 ||
                (attempt === 2 &&
                  (failure.httpStatus === 429 || failure.providerCode === "23"))
              ) {
                await this.policy.stopProvider(
                  auth
                    ? "AUTH"
                    : failure.providerCode === "22"
                      ? "QUOTA"
                      : "THROTTLE",
                  failure.retryAfterMs,
                  failure,
                );
              }
              throw failure;
            }
          },
          { retry: attempt > 0 || this.recovery.current()?.isRetry === true },
        );
      } catch (error) {
        if (error instanceof TourApiPolicyError) throw error;
        const sanitizedError = this.sanitizeError(error, options.operation);

        if (
          attempt === RETRY_DELAYS_MS.length ||
          !this.isRetryable(sanitizedError)
        ) {
          throw sanitizedError;
        }

        const delay = Math.max(
          RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * 501),
          sanitizedError.retryAfterMs,
        );
        if (delay >= this.policy.remainingMs()) this.policy.deadlineExceeded();
        await this.sleep(delay);
      }
    }

    throw new TourApiError(options.operation, "NETWORK_ERROR");
  }

  private buildUrl<T extends z.ZodTypeAny>(options: RequestOptions<T>): URL {
    const endpoint = this.config.get("TOUR_API_ENDPOINT", { infer: true });
    const serviceKey = this.config.get("TOUR_API_SERVICE_KEY", {
      infer: true,
    });

    if (!endpoint || !serviceKey) {
      throw new TourApiError(options.operation, "MISSING_CONFIGURATION");
    }

    let url: URL;

    try {
      url = new URL(`${endpoint.replace(/\/+$/, "")}/${options.operation}`);
    } catch {
      throw new TourApiError(options.operation, "INVALID_CONFIGURATION");
    }

    url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "Haetteum");
    url.searchParams.set("_type", "json");
    url.searchParams.set("pageNo", String(options.pageNo));
    url.searchParams.set("numOfRows", String(options.numOfRows ?? 100));

    for (const [key, value] of Object.entries(options.parameters ?? {})) {
      url.searchParams.set(key, value);
    }

    return url;
  }

  private async requestOnce<T extends z.ZodTypeAny>(
    url: URL,
    options: RequestOptions<T>,
  ): Promise<TourApiPage<z.output<T>>> {
    const { response, body, oversized } = await this.fetchWithTimeout(
      url,
      options.operation,
    );
    await this.recovery.capture(
      options.operation,
      {
        ...options.parameters,
        pageNo: String(options.pageNo),
        numOfRows: String(options.numOfRows ?? 100),
      },
      body,
      response.status,
      this.config.get("TOUR_API_SERVICE_KEY", { infer: true }) ?? "",
    );
    if (oversized) {
      await this.recovery.mark("REJECTED");
      throw new TourApiError(
        options.operation,
        "RESPONSE_TOO_LARGE",
        response.status,
      );
    }
    try {
      return await this.parseCaptured(body, response.status, options);
    } catch (error) {
      if (error instanceof TourApiError)
        error.retryAfterMs = retryAfter(response.headers.get("retry-after"));
      throw error;
    }
  }

  private async parseCaptured<T extends z.ZodTypeAny>(
    body: string,
    status: number,
    options: RequestOptions<T>,
  ): Promise<TourApiPage<z.output<T>>> {
    try {
      return await this.parseResponse(body, status, options);
    } catch (error) {
      await this.recovery.mark(
        error instanceof TourApiError &&
          error.providerCode === "INVALID_RESPONSE"
          ? "INVALID_SCHEMA"
          : "REJECTED",
      );
      throw error;
    }
  }

  private async parseResponse<T extends z.ZodTypeAny>(
    body: string,
    status: number,
    options: RequestOptions<T>,
  ): Promise<TourApiPage<z.output<T>>> {
    let payload: unknown;
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      /* XML gateway or non-JSON HTTP error */
    }
    const providerCode =
      providerErrorCode(payload) ??
      xmlProviderCode(body) ??
      (body.includes("LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR")
        ? "22"
        : undefined);
    if (providerCode && providerCode !== "0000")
      throw new TourApiError(options.operation, providerCode, status);
    if (status < 200 || status >= 300)
      throw new TourApiError(options.operation, `HTTP_${status}`, status);
    if (payload === undefined)
      payload = parseJson(body, options.operation, status);
    const header = tourApiHeaderSchema.safeParse(payload);

    if (!header.success) {
      throw new TourApiError(options.operation, "INVALID_RESPONSE", status);
    }

    if (header.data.response.header.resultCode !== "0000") {
      throw new TourApiError(
        options.operation,
        header.data.response.header.resultCode,
        status,
      );
    }

    const page = tourApiPageSchema(options.itemSchema).safeParse(payload);

    if (!page.success) {
      throw new TourApiError(options.operation, "INVALID_RESPONSE", status);
    }

    await this.recovery.mark("VALIDATED");
    const items = page.data.response.body.items;

    return {
      items: items == null || items === "" ? [] : items.item,
      pageNo: page.data.response.body.pageNo,
      numOfRows: page.data.response.body.numOfRows,
      totalCount: page.data.response.body.totalCount,
    };
  }

  private async fetchWithTimeout(
    url: URL,
    operation: string,
  ): Promise<{ response: Response; body: string; oversized: boolean }> {
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let timedOut = false;
    let timeout!: ReturnType<typeof setTimeout>;
    const cancel = () => {
      controller.abort();
      // Calling cancel closes the reader immediately. A broken underlying cancel hook
      // must not keep this request lock alive indefinitely.
      void reader?.cancel().catch(() => undefined);
    };
    const deadline = this.policy.remainingMs();
    const operationWork = async () => {
      const response = await this.fetch(url, { signal: controller.signal });
      if (timedOut) {
        void response.body?.cancel().catch(() => undefined);
        throw new TourApiError(operation, "TIMEOUT");
      }
      reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0,
        oversized = false;
      if (reader)
        for (;;) {
          const { done, value } = await reader.read();
          if (done || timedOut) break;
          const take = value.subarray(0, Math.max(0, BODY_LIMIT + 1 - size));
          chunks.push(Buffer.from(take));
          size += take.byteLength;
          if (size > BODY_LIMIT) {
            oversized = true;
            cancel();
            break;
          }
        }
      return {
        response,
        body: Buffer.concat(chunks).toString("utf8"),
        oversized,
      };
    };
    try {
      return await Promise.race([
        operationWork(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => {
              timedOut = true;
              cancel();
              if (deadline <= REQUEST_TIMEOUT_MS) {
                try {
                  this.policy.deadlineExceeded();
                } catch (error) {
                  reject(
                    error instanceof Error
                      ? error
                      : new TourApiPolicyError("TOUR_API_BATCH_DEADLINE"),
                  );
                }
              } else reject(new TourApiError(operation, "TIMEOUT"));
            },
            Math.min(REQUEST_TIMEOUT_MS, deadline),
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  private sanitizeError(error: unknown, operation: string): TourApiError {
    if (error instanceof TourApiError) return error;

    if (isAbortError(error)) {
      return new TourApiError(operation, "TIMEOUT");
    }

    return new TourApiError(operation, "NETWORK_ERROR");
  }

  private isRetryable(error: TourApiError): boolean {
    if (
      ["20", "30", "31", "22", "RESPONSE_TOO_LARGE"].includes(
        error.providerCode,
      ) ||
      [401, 403].includes(error.httpStatus ?? 0)
    )
      return false;
    return (
      error.providerCode === "NETWORK_ERROR" ||
      error.providerCode === "TIMEOUT" ||
      ["01", "05", "23"].includes(error.providerCode) ||
      error.httpStatus === 429 ||
      (error.httpStatus != null &&
        error.httpStatus >= 500 &&
        error.httpStatus <= 599)
    );
  }
}

function pickImageBearingPlace(
  places: readonly TourApiPlace[],
): TourApiPlace | null {
  return (
    places.find(
      (place) =>
        (place.firstimage ?? "") !== "" || (place.firstimage2 ?? "") !== "",
    ) ?? null
  );
}

function normalizeServiceKey(serviceKey: string): string {
  try {
    return decodeURIComponent(serviceKey);
  } catch {
    return serviceKey;
  }
}

function parseJson(
  body: string,
  operation: string,
  httpStatus: number,
): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new TourApiError(
      operation,
      xmlProviderCode(body) ?? "INVALID_RESPONSE",
      httpStatus,
    );
  }
}

function xmlProviderCode(body: string): string | undefined {
  const tags = ["returnReasonCode", "resultCode", "code"];

  for (const tag of tags) {
    const match = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i").exec(body);
    const value = match?.[1]?.trim();

    if (value) return value;
  }

  return undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function retryAfter(value: string | null): number {
  if (!value) return 0;
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value) * 1000;
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.max(0, time - Date.now()) : 0;
}
function providerErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as {
    response?: { header?: { resultCode?: unknown } };
    OpenAPI_ServiceResponse?: { cmmMsgHeader?: { returnReasonCode?: unknown } };
  };
  const code =
    p.response?.header?.resultCode ??
    p.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode;
  return typeof code === "string" ? code : undefined;
}
