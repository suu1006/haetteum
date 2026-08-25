import { describe, expect, it } from "vitest";

import {
  findPopularVideoById,
  orderPopularVideosFrom,
} from "@/features/discovery/popular-video-feed";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

describe("popular video feed", () => {
  it("orders the selected reel first without losing the remaining videos", () => {
    const ordered = orderPopularVideosFrom(
      mainDiscoveryMock.popularPlaces.videos,
      "hyeopjae-sunset-highlight",
    );

    expect(ordered?.map((video) => video.id)).toEqual([
      "hyeopjae-sunset-highlight",
      "bijarim-walk-preview",
      "seongsan-sunrise-preview",
    ]);
  });

  it("returns null for an unknown reel", () => {
    expect(
      orderPopularVideosFrom(
        mainDiscoveryMock.popularPlaces.videos,
        "missing",
      ),
    ).toBeNull();
    expect(
      findPopularVideoById(
        mainDiscoveryMock.popularPlaces.videos,
        "missing",
      ),
    ).toBeUndefined();
  });
});
