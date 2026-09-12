import { z } from "zod";

import {
  tourApiFestivalIntroSchema,
  tourApiPlaceDetailSchema,
  tourApiPlaceImageSchema,
} from "./tour-api.schemas.js";
import type {
  TourApiFestivalIntro,
  TourApiPlaceDetail,
  TourApiPlaceImage,
} from "./tour-api.types.js";

export const festivalDetailSnapshotSchema = z.object({
  common: tourApiPlaceDetailSchema,
  intro: tourApiFestivalIntroSchema,
  images: z.array(tourApiPlaceImageSchema),
});

export type FestivalDetailSnapshot = z.infer<
  typeof festivalDetailSnapshotSchema
>;

export function createFestivalDetailSnapshot(input: {
  contentId: string;
  common: TourApiPlaceDetail;
  intro: TourApiFestivalIntro;
  images: readonly TourApiPlaceImage[];
}): FestivalDetailSnapshot {
  const contentId = input.contentId.trim();
  if (!contentId) throw new Error("Invalid TourAPI festival detail content ID");

  const snapshot = festivalDetailSnapshotSchema.parse({
    common: input.common,
    intro: input.intro,
    images: input.images,
  });
  assertContentIdentity(contentId, snapshot.common.contentid, "common detail");
  assertFestivalType(snapshot.common.contenttypeid, "common detail");
  assertContentIdentity(contentId, snapshot.intro.contentid, "intro detail");
  assertFestivalType(snapshot.intro.contenttypeid, "intro detail");
  for (const image of snapshot.images) {
    assertContentIdentity(contentId, image.contentid, "image detail");
  }
  return snapshot;
}

export function parseFestivalDetailSnapshot(
  value: unknown,
  contentId: string,
): FestivalDetailSnapshot {
  const parsed = festivalDetailSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Invalid stored festival detail snapshot");
  }
  try {
    return createFestivalDetailSnapshot({ contentId, ...parsed.data });
  } catch {
    throw new Error("Invalid stored festival detail snapshot");
  }
}

function assertContentIdentity(
  expected: string,
  actual: string,
  operation: string,
): void {
  if (actual.trim() !== expected) {
    throw new Error(`Invalid TourAPI festival ${operation} content ID`);
  }
}

function assertFestivalType(
  contentTypeId: string | undefined,
  operation: string,
): void {
  if (contentTypeId !== undefined && contentTypeId.trim() !== "15") {
    throw new Error(`Invalid TourAPI festival ${operation} content type`);
  }
}
