import { describe, expect, it } from "vitest";

import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import { buildFestivalDetailHref } from "@/features/festivals/festival-detail-model";
import {
  festivalDetails,
  getFestivalDetailById,
  getFestivalStaticParams,
} from "@/features/festivals/festival-detail.mock";

describe("festival detail catalog", () => {
  it("resolves every discovery festival to a non-empty gallery", () => {
    for (const festival of mainDiscoveryMock.festivals) {
      const detail = getFestivalDetailById(festival.id);
      expect(detail?.title).toBe(festival.title);
      expect(detail?.gallery.length).toBeGreaterThan(0);
    }
  });

  it("returns undefined for an unknown id and builds stable routes", () => {
    expect(getFestivalDetailById("missing-festival")).toBeUndefined();
    expect(buildFestivalDetailHref("icheon-rice-cultural-festival")).toBe(
      "/festivals/icheon-rice-cultural-festival",
    );
  });

  it("projects every record into Next static params", () => {
    expect(getFestivalStaticParams()).toEqual(
      festivalDetails.map(({ id }) => ({ festivalId: id })),
    );
  });
});
