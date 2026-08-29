import { resolveDatalabAreaCode } from "./datalab-area-code.js";

describe("resolveDatalabAreaCode", () => {
  it.each([
    ["서울특별시", "1"],
    ["부산광역시", "6"],
    ["세종특별자치시", "8"],
    ["경기도", "31"],
    ["강원특별자치도", "32"],
    ["충청북도", "33"],
    ["전북특별자치도", "37"],
    ["전라남도", "38"],
    ["제주특별자치도", "39"],
  ])("maps %s to areaCode %s", (provinceName, expected) => {
    expect(resolveDatalabAreaCode(provinceName)).toBe(expected);
  });

  it("trims and normalizes before matching", () => {
    expect(resolveDatalabAreaCode("  강원특별자치도 ")).toBe("32");
  });

  it("returns undefined for an unknown province name", () => {
    expect(resolveDatalabAreaCode("알 수 없는 지역")).toBeUndefined();
  });
});
