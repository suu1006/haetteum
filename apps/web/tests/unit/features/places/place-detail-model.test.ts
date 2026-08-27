import { describe, expect, it } from "vitest";

import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import {
  buildPlaceDetailHref,
  parsePlaceDetailQuery,
  selectPlaceReviews,
} from "@/features/places/place-detail-model";
import {
  getPlaceDetailById,
  getPlaceStaticParams,
} from "@/features/places/place-detail.mock";

describe("place detail model", () => {
  it("normalizes unknown route values to the introduction default", () => {
    expect(parsePlaceDetailQuery({ tab: "unknown", source: ["bad"] })).toEqual({
      tab: "introduction",
      source: "all",
    });
  });

  it("builds stable tab and provider URLs", () => {
    expect(buildPlaceDetailHref("icheon-termeden")).toBe(
      "/places/icheon-termeden",
    );
    expect(
      buildPlaceDetailHref("icheon-termeden", {
        tab: "reviews",
        source: "all",
      }),
    ).toBe("/places/icheon-termeden?tab=reviews");
    expect(
      buildPlaceDetailHref("icheon-termeden", {
        tab: "reviews",
        source: "kakao",
      }),
    ).toBe("/places/icheon-termeden?tab=reviews&source=kakao");
    expect(
      buildPlaceDetailHref("icheon-termeden", {
        tab: "course",
        source: "naver",
      }),
    ).toBe("/places/icheon-termeden?tab=course");
  });

  it("filters reviews by provider without mutating the catalog", () => {
    const detail = getPlaceDetailById("icheon-termeden");
    expect(detail).toBeDefined();
    if (!detail) return;

    expect(selectPlaceReviews(detail.reviews, "google")).toEqual(
      detail.reviews.filter((review) => review.provider === "google"),
    );
    expect(selectPlaceReviews(detail.reviews, "all")).toBe(detail.reviews);
  });

  it("resolves the mock AI course for Icheon Termeden", () => {
    expect(getPlaceDetailById("icheon-termeden")).toMatchObject({
      course: {
        days: [
          {
            id: "day-1",
            title: "이천 테르메덴 중심 1일 코스",
            stops: [
              { id: "icheon-rice-breakfast", sequence: 1 },
              { id: "icheon-termeden", sequence: 2 },
              { id: "seolbong-park", sequence: 3 },
              { id: "icheon-city-museum", sequence: 4 },
              { id: "haeju-cold-noodles", sequence: 5 },
            ],
          },
        ],
      },
    });
  });

  it("resolves every discovery place and keeps distribution totals honest", () => {
    for (const place of mainDiscoveryMock.places) {
      const detail = getPlaceDetailById(place.id);
      expect(detail?.title).toBe(place.title);
      expect(detail?.reviews.length).toBeGreaterThan(0);
      expect(
        detail?.ratingDistribution.reduce((sum, item) => sum + item.count, 0),
      ).toBe(place.reviewCount);
      expect(detail).toEqual(
        expect.objectContaining({
          introduction: expect.objectContaining({
            addressLabel: expect.any(String),
            description: expect.any(String),
            heroImages: expect.arrayContaining([
              expect.objectContaining({ src: expect.any(String) }),
            ]),
            facilities: expect.arrayContaining([
              expect.objectContaining({ label: expect.any(String) }),
            ]),
            recommendationPoints: expect.arrayContaining([
              expect.any(String),
            ]),
          }),
          information: expect.objectContaining({
            addressLabel: expect.any(String),
            transportation: expect.arrayContaining([
              expect.objectContaining({ label: expect.any(String) }),
            ]),
            usageGuides: expect.arrayContaining([expect.any(String)]),
          }),
        }),
      );
    }
  });

  it("provides the full reference content for Icheon Termeden", () => {
    expect(getPlaceDetailById("icheon-termeden")).toMatchObject({
      introduction: {
        facilities: expect.arrayContaining([
          expect.objectContaining({ label: "온천·스파" }),
          expect.objectContaining({ label: "워터파크" }),
        ]),
        facilityPreviews: expect.arrayContaining([
          expect.objectContaining({
            image: expect.objectContaining({ src: expect.any(String) }),
          }),
        ]),
        operatingHours: expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            value: expect.any(String),
          }),
        ]),
        prices: expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            value: expect.any(String),
          }),
        ]),
      },
      information: {
        contactLabel: expect.any(String),
        homepageUrl: expect.any(String),
        nearbyAttractions: expect.arrayContaining([
          expect.objectContaining({
            image: expect.objectContaining({ src: expect.any(String) }),
          }),
        ]),
        nearbyRestaurants: expect.arrayContaining([
          expect.objectContaining({
            image: expect.objectContaining({ src: expect.any(String) }),
          }),
        ]),
      },
    });
  });

  it("returns undefined for unknown IDs and projects all static params", () => {
    expect(getPlaceDetailById("missing-place")).toBeUndefined();
    expect(getPlaceStaticParams()).toEqual(
      mainDiscoveryMock.places.map(({ id }) => ({ placeId: id })),
    );
  });
});
