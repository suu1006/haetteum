import { describe, expect, it } from "vitest";

import {
  buildDiscoveryHref,
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

describe("parseDiscoveryQuery", () => {
  it("uses the approved recommendation and Jeju defaults", () => {
    expect(parseDiscoveryQuery({})).toEqual({
      q: "",
      region: "jeju",
      tab: "recommended",
    });
  });

  it("rejects unknown tab and region values", () => {
    expect(parseDiscoveryQuery({ tab: "unknown", region: "mars" })).toEqual({
      q: "",
      region: "jeju",
      tab: "recommended",
    });
  });
});

describe("selectDiscoveryView", () => {
  it("filters the place ranking with a trimmed Korean query", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "  성산  ",
      region: "jeju",
      tab: "places",
    });

    expect(view.places.map((place) => place.title)).toEqual(["성산일출봉"]);
    expect(view.showPlaces).toBe(true);
    expect(view.showFestivals).toBe(false);
  });

  it("shows all approved sections for the recommendation tab", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "",
      region: "jeju",
      tab: "recommended",
    });

    expect(view.showPlaces).toBe(true);
    expect(view.showAiCourse).toBe(true);
    expect(view.showFestivals).toBe(true);
  });
});

it("builds a complete filter URL without dropping the active query", () => {
  expect(
    buildDiscoveryHref(
      { q: "바다", region: "jeju", tab: "recommended" },
      { tab: "festivals" },
      "festivals",
    ),
  ).toBe("/?q=%EB%B0%94%EB%8B%A4&region=jeju&tab=festivals#festivals");
});
