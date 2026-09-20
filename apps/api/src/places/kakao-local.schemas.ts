import { z } from "zod";

const boundedCoordinate = (minimum: number, maximum: number) =>
  z.string().refine((value) => {
    if (value.trim().length === 0) return false;
    const number = Number(value);
    return Number.isFinite(number) && number >= minimum && number <= maximum;
  });

const kakaoPlaceUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname === "place.map.kakao.com"
    );
  });

const documentSchema = z.object({
  id: z.string().regex(/^\d+$/),
  place_name: z.string().trim().min(1),
  category_name: z.string().trim().min(1),
  phone: z.string(),
  address_name: z.string(),
  road_address_name: z.string(),
  x: boundedCoordinate(-180, 180),
  y: boundedCoordinate(-90, 90),
  place_url: kakaoPlaceUrlSchema,
  distance: z.string().optional(),
});

export const kakaoLocalResponseSchema = z.object({
  meta: z.object({
    total_count: z.number().int().nonnegative(),
    pageable_count: z.number().int().nonnegative(),
    is_end: z.boolean(),
  }),
  documents: z.array(documentSchema),
});

export const kakaoCategoryResponseSchema = kakaoLocalResponseSchema;

// next/image 허용 호스트(**.kakaocdn.net) 밖의 URL은 렌더링 시 예외가 나므로 여기서 걸러낸다.
const kakaoCdnUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".kakaocdn.net");
  });

export const kakaoImageResponseSchema = z.object({
  documents: z.array(
    z.object({ thumbnail_url: kakaoCdnUrlSchema.nullable().catch(null) }),
  ),
});
