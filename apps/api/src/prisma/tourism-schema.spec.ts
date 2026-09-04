import { readFileSync } from "node:fs";

import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

const prismaSchema = readFileSync(
  new URL("../../prisma/schema.prisma", import.meta.url),
  "utf8",
);

type ApprovedTourismDelegates = Pick<
  PrismaClient,
  | "tourismRegion"
  | "tourismDistrict"
  | "place"
  | "user"
  | "review"
  | "session"
  | "placeImage"
  | "placeDetailInfo"
  | "placeRanking"
  | "festival"
  | "tourismSyncRun"
>;

const approvedDelegateKeys = [
  "tourismRegion",
  "tourismDistrict",
  "place",
  "user",
  "review",
  "session",
  "placeImage",
  "placeDetailInfo",
  "placeRanking",
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

const reviewOwner = {
  id: "review-owner-id",
  provider: "KAKAO",
  providerUserId: "review-owner-1234567890",
  displayName: "리뷰 작성자",
} satisfies Prisma.UserCreateInput;

const kakaoUser = {
  provider: "KAKAO",
  providerUserId: "1234567890",
  displayName: "해뜸 여행자",
  profileImageUrl: "https://example.test/profile.jpg",
  lastLoginAt: new Date(),
} satisfies Prisma.UserCreateInput;

const session = {
  userId: "session-user-id",
  tokenHash: "a".repeat(64),
  expiresAt: new Date(),
  lastSeenAt: new Date(),
} satisfies Prisma.SessionUncheckedCreateInput;

const review = {
  userId: reviewOwner.id,
  placeId: "6c9bc5a5-836e-420c-bce4-ef68ff421233",
  rating: 5,
  content: "다시 방문하고 싶은 곳이에요.",
} satisfies Prisma.ReviewUncheckedCreateInput;

const reviewIdentity = {
  userId_placeId: { userId: reviewOwner.id, placeId: review.placeId },
} satisfies Prisma.ReviewWhereUniqueInput;

const placeRanking = {
  source: "KTO_DATALAB",
  scope: "NATIONAL",
  sourcePlaceId: "3f73bffa7c6d98063eebe1ecd3305da6",
  sourcePlaceName: "에버랜드",
  sourceCategory: "레저/스포츠",
  audience: "ALL",
  periodStart: "2025-08-01T00:00:00.000Z",
  periodEnd: "2026-07-31T00:00:00.000Z",
  rank: 1,
  sharePercent: "9.0",
  placeId: null,
  sourceFileName: "세대별 인기관광지(전체).csv",
  importedAt: "2026-08-25T07:45:20.000Z",
} satisfies Prisma.PlaceRankingUncheckedCreateInput;

const placeImage = {
  placeId: "24684077-a907-45c3-85bf-b509dab12377",
  source: "TOUR_API",
  serialNumber: "1",
  name: "에버랜드 전경",
  originalUrl: "https://tong.visitkorea.or.kr/image.jpg",
  thumbnailUrl: null,
  copyrightType: "Type1",
  displayOrder: 0,
} satisfies Prisma.PlaceImageUncheckedCreateInput;

const placeDetailInfo = {
  placeId: placeImage.placeId,
  source: "TOUR_API",
  serialNumber: "1",
  fieldGroup: null,
  name: "이용안내",
  text: "방문 전 운영시간을 확인해 주세요.",
  displayOrder: 0,
} satisfies Prisma.PlaceDetailInfoUncheckedCreateInput;

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
      "user",
      "review",
      "session",
      "placeImage",
      "placeDetailInfo",
      "placeRanking",
      "festival",
      "tourismSyncRun",
    ]);
  });

  it("defines user and review delegates with a provider-backed review owner", () => {
    expect(approvedDelegateKeys).toContain("user");
    expect(approvedDelegateKeys).toContain("review");
    expect(prismaSchema).toContain("model User {");
    expect(prismaSchema).toContain("model Review {");
    expect(prismaSchema).toContain("reviews          Review[]");
    expect(reviewOwner.provider).toBe("KAKAO");
    expect(reviewOwner.providerUserId).toBe("review-owner-1234567890");
    expect(Number.isInteger(review.rating)).toBe(true);
    expect(reviewIdentity).toEqual({
      userId_placeId: {
        userId: reviewOwner.id,
        placeId: review.placeId,
      },
    });
  });

  it("stores Kakao profile fields and revocable sessions", () => {
    expect(approvedDelegateKeys).toContain("session");
    expect(prismaSchema).toContain("profileImageUrl String?");
    expect(prismaSchema).toContain("lastLoginAt     DateTime?");
    expect(prismaSchema).toContain("sessions     Session[]");
    expect(prismaSchema).toContain("model Session {");
    expect(prismaSchema).toContain("tokenHash  String   @unique");
    expect(kakaoUser.profileImageUrl).toBe("https://example.test/profile.jpg");
    expect(kakaoUser.lastLoginAt).toBeInstanceOf(Date);
    expect(session.tokenHash).toHaveLength(64);
  });

  it("defines place image and repeated detail delegates", () => {
    expect(prismaSchema).toContain("model PlaceImage {");
    expect(prismaSchema).toContain("model PlaceDetailInfo {");
    expect(prismaSchema).toContain("detailSyncedAt");
    expect(placeImage.originalUrl).toContain("tong.visitkorea.or.kr");
    expect(placeDetailInfo.name).toBe("이용안내");
  });

  it("defines the place ranking delegate and nullable place link", () => {
    expect(placeRanking.rank).toBe(1);
    expect(placeRanking.placeId).toBeNull();
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
