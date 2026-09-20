import { describe, expect, it } from "vitest";

import {
  buildDiscoveryHref,
  buildFestivalFilterHref,
  buildFestivalResetHref,
  defaultFestivalFilters,
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";

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

  it("treats the removed theme-travel tab as the recommendation tab", () => {
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
  it("uses the query to select sections without sample place data", () => {
    const view = selectDiscoveryView(parseDiscoveryQuery({}));
    expect(view).toMatchObject({ showAiCourse: true, showFestivals: true, showSearchResults: false });
    expect(view).not.toHaveProperty("places");
  });

  it("shows API search results for a nonempty recommended query", () => {
    const view = selectDiscoveryView(parseDiscoveryQuery({ q: "  성산  " }));
    expect(view).toMatchObject({ showSearchResults: true, showAiCourse: false, showFestivals: false });
  });

  it("selects rankings without reels or festivals for the places tab", () => {
    const view = selectDiscoveryView({
      q: "  성산  ",
      region: "jeju",
      tab: "places",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });

    expect(view.showRankedPlaces).toBe(true);
    expect(view.showAiCourse).toBe(false);
    expect(view.showFestivals).toBe(false);

  });

  it("shows all approved sections for the recommendation tab", () => {
    const view = selectDiscoveryView({
      q: "",
      region: "gyeonggi",
      tab: "recommended",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });

    expect(view.showRankedPlaces).toBe(false);
    expect(view.showAiCourse).toBe(true);
    expect(view.showFestivals).toBe(true);
    expect(view.showFestivalDiscovery).toBe(false);
  });

  it("uses the dedicated festival discovery only for the festival tab", () => {
    const view = selectDiscoveryView({
      q: "",
      region: "jeju",
      tab: "festivals",
      audience: "all",
      hotAudience: "all",
      reelRegion: "all",
      festivalFilters: defaultFestivalFilters,
    });

    expect(view.showRankedPlaces).toBe(false);
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

describe("independent search scope", () => {
  it("ignores legacy search scope while preserving external search", () => {
    const query = parseDiscoveryQuery({ region: "gyeonggi", reelRegion: "jeju", searchRegion: "seoul", external: "1", q: "경복궁" });
    expect(query).toMatchObject({ region: "gyeonggi", reelRegion: "jeju", externalSearch: true });
    const url = new URL(buildDiscoveryHref(query, {}), "https://test.local");
    expect(url.searchParams.has("searchRegion")).toBe(false);
    expect(url.searchParams.get("external")).toBe("1");
  });
  it("does not inherit a browse region as the search scope", () => {
    expect(parseDiscoveryQuery({ region: "gyeonggi", searchRegion: "seoul" })).not.toHaveProperty("searchRegion");
  });
});
