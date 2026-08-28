import { z } from "zod";

const thumbnailSchema = z.object({
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const thumbnailsSchema = z
  .object({
    default: thumbnailSchema.optional(),
    medium: thumbnailSchema.optional(),
    high: thumbnailSchema.optional(),
    standard: thumbnailSchema.optional(),
    maxres: thumbnailSchema.optional(),
  })
  .partial();

const snippetSchema = z.object({
  title: z.string().optional(),
  channelTitle: z.string().optional(),
  publishedAt: z.string().optional(),
  thumbnails: thumbnailsSchema.optional(),
});

export const youtubeSearchResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z
          .object({
            kind: z.string().optional(),
            videoId: z.string().optional(),
          })
          .optional(),
        snippet: snippetSchema.optional(),
      }),
    )
    .optional()
    .default([]),
});

export const youtubeVideosResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: snippetSchema.optional(),
        contentDetails: z
          .object({ duration: z.string().optional() })
          .optional(),
        statistics: z.object({ viewCount: z.string().optional() }).optional(),
        status: z.object({ embeddable: z.boolean().optional() }).optional(),
      }),
    )
    .optional()
    .default([]),
});

const ISO8601_DURATION = /^P(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/// "PT1M5S" 형태의 ISO8601 재생시간을 초로 환산하며, 하루 이상이면 null
export function parseIso8601Seconds(value: string | undefined): number | null {
  if (!value) return null;
  const match = ISO8601_DURATION.exec(value);
  if (match === null || value.includes("D")) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;

  return Number.isFinite(total) && total > 0 ? total : null;
}
