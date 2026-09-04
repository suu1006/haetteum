import { describe, expect, it } from "vitest";

import {
  buildDiscoveryHref,
  buildFestivalFilterHref,
  buildFestivalResetHref,
  defaultFestivalFilters,
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

describe("parseDiscoveryQuery", () => {
  it("uses the approved recommendation and Gyeonggi defaults", () => {
    expect(parseDiscoveryQuery({})).toEqual({
      q: "",
      region: "gyeonggi",
      tab: "recommended",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });
  });

  it("rejects unknown tab and region values", () => {
    expect(parseDiscoveryQuery({ tab: "unknown", region: "mars" })).toEqual({
      q: "",
      region: "gyeonggi",
      tab: "recommended",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });
  });

  it("accepts approved ranking audiences and defaults unknown values to all", () => {
    expect(parseDiscoveryQuery({ audience: "30s" }).audience).toBe("30s");
    expect(parseDiscoveryQuery({ audience: "teens" }).audience).toBe("all");
  });

  it("parses the hot-place audience independently from the ranking audience", () => {
    const query = parseDiscoveryQuery({ audience: "30s", hotAudience: "50s" });
    expect(query.audience).toBe("30s");
    expect(query.hotAudience).toBe("50s");
    expect(parseDiscoveryQuery({ hotAudience: "teens" }).hotAudience).toBe(
      "all",
    );
  });

  it("accepts an approved reel region and defaults unknown values to all", () => {
    expect(parseDiscoveryQuery({ reelRegion: "jeju" }).reelRegion).toBe(
      "jeju",
    );
    expect(parseDiscoveryQuery({ reelRegion: "gyeongju" }).reelRegion).toBe(
      "all",
    );
  });

  it("treats the disabled theme-travel tab as the recommendation tab", () => {
    expect(
      parseDiscoveryQuery({ tab: "ai-course", region: "gyeonggi" }),
    ).toMatchObject({
      region: "gyeonggi",
      tab: "recommended",
    });
  });

  it("parses approved festival filters and rejects unknown values", () => {
    expect(
      parseDiscoveryQuery({
        tab: "festivals",
        festivalStatus: "ongoing",
        festivalPeriod: "week",
        festivalPrice: "free",
        festivalAudience: "family",
      }),
    ).toMatchObject({
      tab: "festivals",
      festivalFilters: {
        ongoing: true,
        thisWeek: true,
        free: true,
        family: true,
      },
    });

    expect(
      parseDiscoveryQuery({
        festivalStatus: "ended",
        festivalPeriod: "month",
        festivalPrice: "paid",
        festivalAudience: "couple",
      }).festivalFilters,
    ).toEqual(defaultFestivalFilters);
  });

  it("normalizes a festival tab without an approved festival region to all", () => {
    expect(parseDiscoveryQuery({ tab: "festivals" })).toMatchObject({
      tab: "festivals",
      region: "all",
    });
    expect(
      parseDiscoveryQuery({ tab: "festivals", region: "gyeonggi" }),
    ).toMatchObject({ tab: "festivals", region: "all" });
  });
});

describe("selectDiscoveryView", () => {
  it("defines local media and reel details for every popular video", () => {
    for (const video of mainDiscoveryMock.popularPlaces.videos) {
      expect(video.address).toMatch(/^제주특별자치도/);
      expect(video.description.length).toBeGreaterThan(0);
      expect(video.commentCountLabel).toMatch(/^\d/);
      expect(video.shareCountLabel).toMatch(/^\d/);
      expect(video.video.src).toMatch(/^\/videos\/discovery\/.+\.mp4$/);
      expect(video.video.posterSrc).toBe(video.image.src);
      expect(video.video.durationSeconds).toBe(6);
      expect(video.video.hasAudio).toBe(false);
    }
  });

  it("selects the three approved Gyeonggi recommendations by default", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, parseDiscoveryQuery({}));

    expect(view.places.map((place) => place.title)).toEqual([
      "이천 테르메덴",
      "에버랜드",
      "수원 화성",
    ]);
    expect(view.places.map((place) => place.location)).toEqual([
      "이천",
      "용인",
      "수원",
    ]);
    expect(view.places.map((place) => place.rating)).toEqual([4.6, 4.5, 4.4]);
    expect(view.places.map((place) => place.reviewCount)).toEqual([
      2345, 3892, 1987,
    ]);
  });

  it("filters the place ranking with a trimmed Korean query", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "  성산  ",
      region: "jeju",
      tab: "places",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });

    expect(view.places.map((place) => place.title)).toEqual(["성산일출봉"]);
    expect(view.showRankedPlaces).toBe(false);
    expect(view.showPopularPlaces).toBe(true);
    expect(view.showFestivals).toBe(false);
  });

  it("selects only the popular-place feed for the places tab", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "  성산  ",
      region: "jeju",
      tab: "places",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });

    expect(view.showRankedPlaces).toBe(false);
    expect(view.showPopularPlaces).toBe(true);
    expect(view.showAiCourse).toBe(false);
    expect(view.showFestivals).toBe(false);
    expect(view.popularVideos.map((item) => item.title)).toEqual([
      "성산일출봉 일출 미리보기",
    ]);
    expect(view.videoCourses.map((item) => item.title)).toEqual([
      "성산 일출 코스",
    ]);
    expect(view.travelThemes).toEqual(mainDiscoveryMock.popularPlaces.themes);
  });

  it("shows all approved sections for the recommendation tab", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "",
      region: "gyeonggi",
      tab: "recommended",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });

    expect(view.showRankedPlaces).toBe(true);
    expect(view.showPopularPlaces).toBe(false);
    expect(view.showAiCourse).toBe(true);
    expect(view.showFestivals).toBe(true);
    expect(view.showFestivalDiscovery).toBe(false);
  });

  it("keeps the disabled theme travel surface hidden", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "",
      region: "gyeonggi",
      tab: "ai-course",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });

    expect(view.showRankedPlaces).toBe(false);
    expect(view.showPopularPlaces).toBe(false);
    expect(view.showAiCourse).toBe(false);
    expect(view.showThemeTravel).toBe(false);
    expect(view.showFestivals).toBe(false);
    expect(view.showFestivalDiscovery).toBe(false);
  });

  it("uses the dedicated festival discovery only for the festival tab", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "",
      region: "jeju",
      tab: "festivals",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });

    expect(view.showRankedPlaces).toBe(false);
    expect(view.showPopularPlaces).toBe(false);
    expect(view.showAiCourse).toBe(false);
    expect(view.showFestivals).toBe(false);
    expect(view.showFestivalDiscovery).toBe(true);
  });

});

it("builds a complete filter URL without dropping the active query", () => {
  expect(
    buildDiscoveryHref(
      {
        q: "바다",
        region: "jeju",
        tab: "recommended",
        audience: "40s",
        hotAudience: "all",
        reelRegion: "all",
        festivalFilters: defaultFestivalFilters,
      },
      { tab: "festivals", audience: "50s" },
      "festivals",
    ),
  ).toBe(
    "/?q=%EB%B0%94%EB%8B%A4&region=jeju&tab=festivals&audience=50s#festivals",
  );
});

it("adds the hot-place audience only when it differs from the default", () => {
  const base = {
    q: "",
    region: "gyeonggi" as const,
    tab: "recommended" as const,
    audience: "all" as const,
    hotAudience: "all" as const,
    reelRegion: "all" as const,
    festivalFilters: defaultFestivalFilters,
  };

  expect(buildDiscoveryHref(base, { hotAudience: "40s" })).toBe(
    "/?region=gyeonggi&tab=recommended&hotAudience=40s",
  );
  expect(
    buildDiscoveryHref({ ...base, audience: "20s" }, { hotAudience: "40s" }),
  ).toBe("/?region=gyeonggi&tab=recommended&audience=20s&hotAudience=40s");
  expect(buildDiscoveryHref(base, { audience: "30s" })).toBe(
    "/?region=gyeonggi&tab=recommended&audience=30s",
  );
});

it("adds the reel region only when it differs from the default", () => {
  const base = {
    q: "",
    region: "gyeonggi" as const,
    tab: "places" as const,
    audience: "all" as const,
    hotAudience: "all" as const,
    reelRegion: "all" as const,
    festivalFilters: defaultFestivalFilters,
  };

  expect(buildDiscoveryHref(base, { reelRegion: "jeju" })).toBe(
    "/?region=gyeonggi&tab=places&reelRegion=jeju",
  );
  expect(buildDiscoveryHref(base, { reelRegion: "all" })).toBe(
    "/?region=gyeonggi&tab=places",
  );
});

it("toggles one festival filter without dropping the discovery query", () => {
  const query = {
    q: "꽃",
    region: "jeju",
    tab: "festivals",
    audience: "30s",
    hotAudience: "all",
    reelRegion: "all",
    festivalFilters: defaultFestivalFilters,
  } as const;

  expect(buildFestivalFilterHref(query, "thisWeek")).toBe(
    "/?q=%EA%BD%83&region=jeju&tab=festivals&audience=30s&festivalPeriod=week#festivals",
  );

  expect(
    buildFestivalResetHref({
      ...query,
      festivalFilters: { ...defaultFestivalFilters, free: true },
    }),
  ).toBe(
    "/?q=%EA%BD%83&region=jeju&tab=festivals&audience=30s#festivals",
  );
});
