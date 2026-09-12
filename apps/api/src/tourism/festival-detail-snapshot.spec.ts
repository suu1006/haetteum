import {
  createFestivalDetailSnapshot,
  parseFestivalDetailSnapshot,
} from "./festival-detail-snapshot.js";

const common = {
  contentid: "3351268",
  contenttypeid: "15",
  overview: "축제 소개",
  homepage: "https://example.com",
};
const intro = {
  contentid: "3351268",
  contenttypeid: "15",
  eventplace: "장안1수변공원",
};
const images = [
  {
    contentid: "3351268",
    serialnum: "1",
    originimgurl: "https://tong.visitkorea.or.kr/a.jpg",
  },
];

describe("festival detail snapshot", () => {
  it("validates and preserves a complete TourAPI festival detail bundle", () => {
    const snapshot = createFestivalDetailSnapshot({
      contentId: "3351268",
      common,
      intro,
      images,
    });

    expect(parseFestivalDetailSnapshot(snapshot, "3351268")).toEqual({
      common,
      intro,
      images,
    });
  });

  it.each([
    {
      label: "common content ID",
      input: { common: { ...common, contentid: "other" }, intro, images },
      message: "Invalid TourAPI festival common detail content ID",
    },
    {
      label: "intro content ID",
      input: { common, intro: { ...intro, contentid: "other" }, images },
      message: "Invalid TourAPI festival intro detail content ID",
    },
    {
      label: "image content ID",
      input: {
        common,
        intro,
        images: [{ ...images[0], contentid: "other" }],
      },
      message: "Invalid TourAPI festival image detail content ID",
    },
    {
      label: "common content type",
      input: { common: { ...common, contenttypeid: "12" }, intro, images },
      message: "Invalid TourAPI festival common detail content type",
    },
    {
      label: "intro content type",
      input: { common, intro: { ...intro, contenttypeid: "12" }, images },
      message: "Invalid TourAPI festival intro detail content type",
    },
  ])("rejects a mismatched $label", ({ input, message }) => {
    expect(() =>
      createFestivalDetailSnapshot({ contentId: "3351268", ...input }),
    ).toThrow(message);
  });

  it("rejects malformed persisted JSON", () => {
    expect(() =>
      parseFestivalDetailSnapshot(
        { common, intro, images: "not-an-array" },
        "3351268",
      ),
    ).toThrow("Invalid stored festival detail snapshot");
  });
});
