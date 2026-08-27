import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import { kakaoCategoryResponseSchema } from "./kakao-local.schemas.js";

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
  searchCategory(input: {
    categoryCode: KakaoCategoryCode;
    longitude: number;
    latitude: number;
    size: number;
  }): Promise<readonly KakaoLocalPlace[]>;
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

  async searchCategory(input: {
    categoryCode: KakaoCategoryCode;
    longitude: number;
    latitude: number;
    size: number;
  }): Promise<readonly KakaoLocalPlace[]> {
    const key = this.config.get("KAKAO_REST_API_KEY", { infer: true });
    if (!key) throw new KakaoLocalError("NOT_CONFIGURED");
    const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
    url.searchParams.set("category_group_code", input.categoryCode);
    url.searchParams.set("x", String(input.longitude));
    url.searchParams.set("y", String(input.latitude));
    url.searchParams.set("radius", "20000");
    url.searchParams.set("page", "1");
    url.searchParams.set("size", String(input.size));
    url.searchParams.set("sort", "distance");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await this.fetch(url, {
        headers: { Authorization: `KakaoAK ${key}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new KakaoLocalError(`HTTP_${response.status}`);
      const parsed = kakaoCategoryResponseSchema.safeParse(
        await response.json(),
      );
      if (!parsed.success) throw new KakaoLocalError("INVALID_RESPONSE");
      return parsed.data.documents.map((document) => ({
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
          optionalText(document.distance) == null
            ? null
            : Math.max(
                0,
                Math.round(finiteNumber(document.distance, "DISTANCE")),
              ),
      }));
    } catch (error) {
      if (error instanceof KakaoLocalError) throw error;
      throw new KakaoLocalError("NETWORK_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}
