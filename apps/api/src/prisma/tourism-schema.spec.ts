import { readFileSync } from "node:fs";

import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

const prismaSchema = readFileSync(
  new URL("../../prisma/schema.prisma", import.meta.url),
  "utf8",
);

type ApprovedTourismDelegates = Pick<
  PrismaClient,
  "tourismRegion" | "tourismDistrict" | "place" | "festival" | "tourismSyncRun"
>;

const approvedDelegateKeys = [
  "tourismRegion",
  "tourismDistrict",
  "place",
  "festival",
  "tourismSyncRun",
] as const satisfies readonly (keyof ApprovedTourismDelegates)[];

const providerIdentity = {
  source_externalId: {
    source: "TOUR_API",
    externalId: "place-123",
  },
} satisfies Prisma.PlaceWhereUniqueInput;

const districtIdentity = {
  regionId_providerCode: {
    regionId: "region-uuid",
    providerCode: "110",
  },
} satisfies Prisma.TourismDistrictWhereUniqueInput;

const placeWithoutDistrict = {
  source: "TOUR_API",
  externalId: "place-123",
  contentTypeId: 12,
  regionId: "region-uuid",
  districtId: null,
  title: "Sample place",
  providerModifiedAt: "2026-08-22T00:00:00.000Z",
  lastSyncedAt: "2026-08-22T00:00:00.000Z",
} satisfies Prisma.PlaceUncheckedCreateInput;

const festivalIdentity = {
  source_externalId: {
    source: "TOUR_API",
    externalId: "festival-123",
  },
} satisfies Prisma.FestivalWhereUniqueInput;

const festival = {
  source: "TOUR_API",
  externalId: "festival-123",
  contentTypeId: 15,
  title: "Sample festival",
  eventStartDate: "2026-08-01T00:00:00.000Z",
  eventEndDate: "2026-08-31T00:00:00.000Z",
  providerModifiedAt: "2026-08-25T00:00:00.000Z",
  lastSyncedAt: "2026-08-25T00:00:00.000Z",
} satisfies Prisma.FestivalUncheckedCreateInput;

type RegionIdIsRequired =
  Record<never, never> extends Pick<
    Prisma.PlaceUncheckedCreateInput,
    "regionId"
  >
    ? false
    : true;

type DistrictIdAllowsNull =
  null extends Prisma.PlaceUncheckedCreateInput["districtId"] ? true : false;

const regionIdIsRequired = true satisfies RegionIdIsRequired;
const districtIdAllowsNull = true satisfies DistrictIdAllowsNull;

describe("tourism Prisma generated TypeScript contract", () => {
  it("defines the independent festival model and provider identity", () => {
    expect(prismaSchema).toContain("model Festival {");
    expect(prismaSchema).toContain("@@unique([source, externalId])");
    expect(prismaSchema).toContain("@@index([eventStartDate, eventEndDate])");
    expect(prismaSchema).toContain(
      "@@index([providerRegionCode, eventStartDate])",
    );
    expect(prismaSchema).toContain('@@map("festivals")');
  });

  it("keeps the approved tourism delegates on PrismaClient", () => {
    expect(approvedDelegateKeys).toEqual([
      "tourismRegion",
      "tourismDistrict",
      "place",
      "festival",
      "tourismSyncRun",
    ]);
  });

  it("uses source and externalId as the festival provider identity", () => {
    expect(festivalIdentity).toEqual({
      source_externalId: {
        source: "TOUR_API",
        externalId: "festival-123",
      },
    });
    expect(festival.contentTypeId).toBe(15);
    expect(festival.eventStartDate).toBe("2026-08-01T00:00:00.000Z");
    expect(festival.eventEndDate).toBe("2026-08-31T00:00:00.000Z");
  });

  it("uses source and externalId as the provider identity", () => {
    expect(providerIdentity).toEqual({
      source_externalId: {
        source: "TOUR_API",
        externalId: "place-123",
      },
    });
  });

  it("scopes the district provider identity to its region", () => {
    expect(districtIdentity).toEqual({
      regionId_providerCode: {
        regionId: "region-uuid",
        providerCode: "110",
      },
    });
  });

  it("requires regionId while allowing a null districtId", () => {
    expect(placeWithoutDistrict.regionId).toBe("region-uuid");
    expect(placeWithoutDistrict.districtId).toBeNull();
    expect(regionIdIsRequired).toBe(true);
    expect(districtIdAllowsNull).toBe(true);
  });
});
