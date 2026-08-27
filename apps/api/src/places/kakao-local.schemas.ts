import { z } from "zod";

const documentSchema = z.object({
  id: z.string(),
  place_name: z.string(),
  category_name: z.string(),
  phone: z.string(),
  address_name: z.string(),
  road_address_name: z.string(),
  x: z.string(),
  y: z.string(),
  place_url: z.string().url(),
  distance: z.string(),
});

export const kakaoCategoryResponseSchema = z.object({
  meta: z.object({
    total_count: z.number().int().nonnegative(),
    pageable_count: z.number().int().nonnegative(),
    is_end: z.boolean(),
  }),
  documents: z.array(documentSchema),
});
