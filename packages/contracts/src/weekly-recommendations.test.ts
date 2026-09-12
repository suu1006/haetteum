import { expect, it } from "vitest";
import { WeeklyRecommendationsResponseSchema } from "./index.js";
import { ListPlacesQuerySchema, PlaceDetailResponseSchema } from "./places.js";

const item = {
  id: "00000000-0000-4000-8000-000000000001", title: "충남 여행지", region: "chungnam",
  district: null, address: null, longitude: null, latitude: null,
  primaryImageUrl: "https://media.example.com/weekly/a.webp", imageCopyrightType: "Type1",
};
it("accepts a published nationwide batch and an unpublished empty week", () => {
  const response = { week: "2026-09-07", items: [item] };
  expect(WeeklyRecommendationsResponseSchema.parse(response)).toEqual(response);
  expect(WeeklyRecommendationsResponseSchema.parse({ week: null, items: [] })).toEqual({ week: null, items: [] });
});
it.each([
  { week: "2026-02-30", items: [] },
  { week: "2026-09-07", items: Array(21).fill(item) },
  { week: "2026-09-07", items: [{ ...item, id: "not-a-uuid" }] },
  { week: "2026-09-07", items: [{ ...item, region: "" }] },
])("rejects invalid batches", (response) => {
  expect(WeeklyRecommendationsResponseSchema.safeParse(response).success).toBe(false);
});
it("allows nationwide detail slugs while preserving browse query restrictions", () => {
  expect(PlaceDetailResponseSchema.shape.region.safeParse("chungnam").success).toBe(true);
  expect(ListPlacesQuerySchema.safeParse({ region: "chungnam" }).success).toBe(false);
});
