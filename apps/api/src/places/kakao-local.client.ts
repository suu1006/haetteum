import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import {
  kakaoImageResponseSchema,
  kakaoLocalResponseSchema,
} from "./kakao-local.schemas.js";

export const KAKAO_LOCAL_PORT = Symbol("KAKAO_LOCAL_PORT");
export const KAKAO_LOCAL_FETCH = Symbol("KAKAO_LOCAL_FETCH");

export type KakaoCategoryCode = "AT4" | "CT1" | "FD6" | "CE7";
export type KakaoLocalPlace = {
  id: string;
  placeName: string;
  categoryName: string;
  phone: string | null;
  addressName: string | null;
  roadAddressName: string | null;
  longitude: number;
  latitude: number;
  placeUrl: string;
  distanceMeters: number | null;
};

export interface KakaoLocalPort {
  isConfigured(): boolean;
  searchKeyword(input: {
    query: string;
    size: number;
  }): Promise<readonly KakaoLocalPlace[]>;
  searchCategory(input: {
    categoryCode: KakaoCategoryCode;
    longitude: number;
    latitude: number;
    size: number;
  }): Promise<readonly KakaoLocalPlace[]>;
  /** 첫 번째 이미지 검색 결과의 kakaocdn 썸네일 URL. 없으면 null. */
  searchImage(query: string): Promise<string | null>;
}

export class KakaoLocalError extends Error {
  constructor(readonly providerCode: string) {
    super(`Kakao Local failed (${providerCode})`);
  }
}

function optionalText(value: string): string | null {
  const text = value.trim();
  return text || null;
}

function finiteNumber(value: string, field: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new KakaoLocalError(`INVALID_${field}`);
  return number;
}

@Injectable()
export class KakaoLocalClient implements KakaoLocalPort {
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(KAKAO_LOCAL_FETCH) private readonly fetch: typeof globalThis.fetch,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get("KAKAO_REST_API_KEY", { infer: true }));
  }

  async searchKeyword(input: {
    query: string;
    size: number;
  }): Promise<readonly KakaoLocalPlace[]> {
    const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url.searchParams.set("query", input.query);
    url.searchParams.set("page", "1");
    url.searchParams.set("size", String(input.size));
    url.searchParams.set("sort", "accuracy");
    return this.search(url);
  }

  async searchCategory(input: {
    categoryCode: KakaoCategoryCode;
    longitude: number;
    latitude: number;
    size: number;
  }): Promise<readonly KakaoLocalPlace[]> {
    const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
    url.searchParams.set("category_group_code", input.categoryCode);
    url.searchParams.set("x", String(input.longitude));
    url.searchParams.set("y", String(input.latitude));
    url.searchParams.set("radius", "20000");
    url.searchParams.set("page", "1");
    url.searchParams.set("size", String(input.size));
    url.searchParams.set("sort", "distance");
    return this.search(url);
  }

  async searchImage(query: string): Promise<string | null> {
    const url = new URL("https://dapi.kakao.com/v2/search/image");
    url.searchParams.set("query", query);
    url.searchParams.set("size", "1");
    url.searchParams.set("sort", "accuracy");
    const parsed = kakaoImageResponseSchema.safeParse(await this.getJson(url));
    if (!parsed.success) throw new KakaoLocalError("INVALID_RESPONSE");
    // 검색 API 썸네일은 130x130 고정이라 2x 화면의 2열 카드(약 440px)에서 흐려진다.
    // ponytail: 비공식 CDN 변형(600x0_65_wr)에 의존. 막히면 카드가 핀 아이콘으로 대체되니 원본 썸네일로 되돌릴 것.
    return (
      parsed.data.documents[0]?.thumbnail_url?.replace(
        "/argon/130x130_85_c/",
        "/argon/600x0_65_wr/",
      ) ?? null
    );
  }

  private async search(url: URL): Promise<readonly KakaoLocalPlace[]> {
    const parsed = kakaoLocalResponseSchema.safeParse(await this.getJson(url));
    if (!parsed.success) throw new KakaoLocalError("INVALID_RESPONSE");
    return parsed.data.documents.map((document) => {
      const distance = optionalText(document.distance ?? "");
      return {
        id: document.id.trim(),
        placeName: document.place_name.trim(),
        categoryName: document.category_name.trim(),
        phone: optionalText(document.phone),
        addressName: optionalText(document.address_name),
        roadAddressName: optionalText(document.road_address_name),
        longitude: finiteNumber(document.x, "LONGITUDE"),
        latitude: finiteNumber(document.y, "LATITUDE"),
        placeUrl: document.place_url,
        distanceMeters:
          distance == null
            ? null
            : Math.max(0, Math.round(finiteNumber(distance, "DISTANCE"))),
      };
    });
  }

  private async getJson(url: URL): Promise<unknown> {
    const key = this.config.get("KAKAO_REST_API_KEY", { infer: true });
    if (!key) throw new KakaoLocalError("NOT_CONFIGURED");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await this.fetch(url, {
        headers: { Authorization: `KakaoAK ${key}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new KakaoLocalError(`HTTP_${response.status}`);
      return await response.json();
    } catch (error) {
      if (error instanceof KakaoLocalError) throw error;
      throw new KakaoLocalError("NETWORK_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}
