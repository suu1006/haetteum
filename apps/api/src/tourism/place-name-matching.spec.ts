import {
  buildSearchKeywords,
  pickRelevantCandidate,
} from "./place-name-matching.js";
import type { TourApiPlace } from "./tour-api.types.js";

function place(overrides: Partial<TourApiPlace> = {}): TourApiPlace {
  return {
    contentid: "1",
    contenttypeid: "12",
    title: "청령포",
    modifiedtime: "20260101000000",
    lDongRegnCd: "32",
    firstimage: "http://tong.visitkorea.or.kr/a.jpg",
    ...overrides,
  };
}

describe("buildSearchKeywords", () => {
  it("returns only the trimmed original when no suffix pattern applies", () => {
    expect(buildSearchKeywords("  청령포  ")).toEqual(["청령포"]);
  });

  it("adds a version without a trailing parenthetical", () => {
    expect(buildSearchKeywords("도깨비촬영지(영진해변)")).toEqual([
      "도깨비촬영지(영진해변)",
      "도깨비촬영지",
    ]);
  });

  it("adds a version without a numbered facility suffix", () => {
    expect(buildSearchKeywords("킨텍스제2전시장")).toEqual([
      "킨텍스제2전시장",
      "킨텍스",
    ]);
  });

  it("adds a version without a branch marker suffix", () => {
    expect(buildSearchKeywords("롯데월드잠실점")).toEqual([
      "롯데월드잠실점",
      "롯데월드잠실",
    ]);
  });

  it("does not add an empty or single-character remainder", () => {
    expect(buildSearchKeywords("점")).toEqual(["점"]);
  });
});

describe("pickRelevantCandidate", () => {
  it("picks an exact normalized title match", () => {
    const candidate = place({ title: "청령포" });
    expect(pickRelevantCandidate([candidate], "청령포")).toBe(candidate);
  });

  it("ignores whitespace differences between the query and the title", () => {
    const candidate = place({ title: "강원랜드 카지노" });
    expect(pickRelevantCandidate([candidate], "강원랜드카지노")).toBe(
      candidate,
    );
  });

  it("accepts a candidate whose title extends the original name", () => {
    const candidate = place({ title: "롯데월드 민속박물관" });
    expect(pickRelevantCandidate([candidate], "롯데월드")).toBe(candidate);
  });

  it("rejects shopping and dining content types even with a matching title", () => {
    const candidate = place({ contenttypeid: "38", title: "청령포" });
    expect(pickRelevantCandidate([candidate], "청령포")).toBeNull();
  });

  it("rejects a candidate without any image", () => {
    const candidate = place({
      title: "청령포",
      firstimage: undefined,
      firstimage2: undefined,
    });
    expect(pickRelevantCandidate([candidate], "청령포")).toBeNull();
  });

  it("rejects an unrelated title even when other candidates share content type", () => {
    const candidates = [
      place({ title: "나이키 롯데월드몰점" }),
      place({ title: "롯데월드 아이스링크" }),
    ];
    expect(pickRelevantCandidate(candidates, "롯데월드잠실점")).toBeNull();
  });

  it("returns null for a too-short original name", () => {
    expect(pickRelevantCandidate([place()], "역")).toBeNull();
  });

  it("prefers the exactly named candidate over an earlier extended title", () => {
    const extended = place({ title: "코엑스 아쿠아리움" });
    const exact = place({ title: "코엑스", contenttypeid: "14" });
    expect(pickRelevantCandidate([extended, exact], "코엑스")).toBe(exact);
  });

  it("refuses a merely extended title when the caller needs the exact place", () => {
    const candidate = place({ title: "킨텍스 바이 케이트리" });
    expect(
      pickRelevantCandidate([candidate], "킨텍스", {
        requireExactTitle: true,
      }),
    ).toBeNull();
    expect(pickRelevantCandidate([candidate], "킨텍스")).toBe(candidate);
  });

  it("accepts an imageless candidate when the caller does not need a photo", () => {
    const candidate = place({
      title: "예술의전당",
      contenttypeid: "14",
      firstimage: undefined,
      firstimage2: undefined,
    });
    expect(
      pickRelevantCandidate([candidate], "예술의전당", { requireImage: false }),
    ).toBe(candidate);
  });
});
