import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

import type { ApiEnvironment } from "../config/environment.js";
import {
  tourApiChangedPlaceSchema,
  tourApiDistrictSchema,
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
  TourApiChangedPlace,
  TourApiDistrict,
  TourApiFestival,
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
const RETRY_DELAYS_MS = [250, 750] as const;

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
  ) {
    super(`TourAPI ${operation} failed (${providerCode})`);
    this.name = "TourApiError";
  }
}

@Injectable()
export class TourApiClient implements TourApiPort, FestivalApiPort {
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(TOUR_API_FETCH) private readonly fetch: TourApiFetch,
    @Inject(TOUR_API_SLEEP) private readonly sleep: TourApiSleep,
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

  private async request<T extends z.ZodTypeAny>(
    options: RequestOptions<T>,
  ): Promise<TourApiPage<z.output<T>>> {
    const url = this.buildUrl(options);

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await this.requestOnce(url, options);
      } catch (error) {
        const sanitizedError = this.sanitizeError(error, options.operation);

        if (
          attempt === RETRY_DELAYS_MS.length ||
          !this.isRetryable(sanitizedError)
        ) {
          throw sanitizedError;
        }

        await this.sleep(RETRY_DELAYS_MS[attempt]);
      }
    }

    throw new TourApiError(options.operation, "NETWORK_ERROR");
  }

  private buildUrl<T extends z.ZodTypeAny>(options: RequestOptions<T>): URL {
    const endpoint = this.config.get("END_POINT", { infer: true });
    const serviceKey = this.config.get("SERVICE_KEY", { infer: true });

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
    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new TourApiError(
        options.operation,
        `HTTP_${response.status}`,
        response.status,
      );
    }

    const body = await response.text();
    const payload = parseJson(body, options.operation, response.status);
    const header = tourApiHeaderSchema.safeParse(payload);

    if (!header.success) {
      throw new TourApiError(
        options.operation,
        "INVALID_RESPONSE",
        response.status,
      );
    }

    if (header.data.response.header.resultCode !== "0000") {
      throw new TourApiError(
        options.operation,
        header.data.response.header.resultCode,
        response.status,
      );
    }

    const page = tourApiPageSchema(options.itemSchema).safeParse(payload);

    if (!page.success) {
      throw new TourApiError(
        options.operation,
        "INVALID_RESPONSE",
        response.status,
      );
    }

    const items = page.data.response.body.items;

    return {
      items: items == null || items === "" ? [] : items.item,
      pageNo: page.data.response.body.pageNo,
      numOfRows: page.data.response.body.numOfRows,
      totalCount: page.data.response.body.totalCount,
    };
  }

  private async fetchWithTimeout(url: URL): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await this.fetch(url, { signal: controller.signal });
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
    return (
      error.providerCode === "NETWORK_ERROR" ||
      error.providerCode === "TIMEOUT" ||
      error.httpStatus === 429 ||
      (error.httpStatus != null &&
        error.httpStatus >= 500 &&
        error.httpStatus <= 599)
    );
  }
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
