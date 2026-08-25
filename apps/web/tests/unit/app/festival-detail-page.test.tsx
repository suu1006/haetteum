import { describe, expect, it } from "vitest";

import FestivalDetailPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/festivals/[festivalId]/page";

describe("festival detail page", () => {
  it("exports every detail id as a static param", async () => {
    expect(await generateStaticParams()).toContainEqual({
      festivalId: "icheon-rice-cultural-festival",
    });
  });

  it("builds festival-specific metadata", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({
          festivalId: "icheon-rice-cultural-festival",
        }),
      }),
    ).resolves.toMatchObject({
      title: "이천쌀문화축제 | 해뜸",
    });
  });

  it("returns the reusable screen for a known festival", async () => {
    const result = await FestivalDetailPage({
      params: Promise.resolve({ festivalId: "icheon-rice-cultural-festival" }),
    });

    expect(result.type).toBeDefined();
  });
});
