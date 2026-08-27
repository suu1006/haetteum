import {
  executeTourismSmoke,
  runTourismSmoke,
} from "./tourism-smoke.command.js";
import type {
  TourApiChangedPlace,
  TourApiDistrict,
  TourApiPage,
  TourApiPlace,
  TourApiPort,
} from "./tour-api.types.js";

const district: TourApiDistrict = {
  lDongRegnCd: "50",
  lDongSignguCd: "110",
  lDongSignguNm: "제주시",
};

const place: TourApiPlace = {
  contentid: "2704412",
  contenttypeid: "12",
  title: "아침미소목장",
  modifiedtime: "20260720123456",
  lDongRegnCd: "50",
};

const changedPlace: TourApiChangedPlace = {
  ...place,
  showflag: "1",
};

const ALLOWED_OUTPUT_KEYS = new Set([
  "operation",
  "httpStatus",
  "providerResultCode",
  "totalCount",
  "sampleContentId",
  "sampleTitle",
  "hasOverview",
  "hasHomepage",
]);
const SAFE_ERROR = "Tourism smoke command failed.";
const SAFE_DETAIL_MISMATCH = "Tourism smoke detail content ID mismatch";

function page<T>(item: T): TourApiPage<T> {
  return {
    items: [item],
    pageNo: 1,
    numOfRows: 100,
    totalCount: 1,
  };
}

function createProvider(detailContentId: string): {
  provider: TourApiPort;
  calls: string[];
} {
  const calls: string[] = [];

  return {
    calls,
    provider: {
      getDistrictPage: (input) => {
        calls.push(`ldongCode2:${input.regionCode}:${input.pageNo}`);
        return Promise.resolve(page(district));
      },
      getPlacePage: (input) => {
        calls.push(`areaBasedList2:${input.regionCode}:${input.pageNo}`);
        return Promise.resolve(page(place));
      },
      getChangedPlacePage: () =>
        Promise.reject(new Error("Incremental method must not be called")),
      getChangedPlaceProbePage: (input) => {
        calls.push(
          `areaBasedSyncList2:${input.regionCode}:${input.showflag}:${input.pageNo}`,
        );
        return Promise.resolve(page(changedPlace));
      },
      getPlaceCommonDetail: (contentId) => {
        calls.push(`detailCommon2:${contentId}`);
        return Promise.resolve({
          contentid: detailContentId,
          title: place.title,
          overview: "초원의 아침을 만나는 목장입니다.",
          homepage: '<a href="https://provider.example">홈페이지</a>',
        });
      },
      getPlaceIntro: (contentId) => Promise.resolve({ contentid: contentId }),
      getPlaceRepeatInfo: () => Promise.resolve([]),
      getPlaceImages: () => Promise.resolve([]),
    },
  };
}

function parseOutput(line: string): Record<string, unknown> {
  const parsed = JSON.parse(line) as unknown;

  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object output");
  }

  return parsed as Record<string, unknown>;
}

function expectSafeText(text: string): void {
  expect(text).not.toContain("serviceKey");
  expect(text).not.toContain("SERVICE_KEY");
  expect(text).not.toContain("END_POINT");
  expect(text).not.toContain("http://");
  expect(text).not.toContain("https://");
}

describe("tourism smoke command", () => {
  it("keeps provider call order and the output whitelist when trimmed content IDs match", async () => {
    const { provider, calls } = createProvider(" 2704412 ");
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await executeTourismSmoke(
      provider,
      (message) => stdout.push(message),
      (message) => stderr.push(message),
    );

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(calls).toEqual([
      "ldongCode2:50:1",
      "areaBasedList2:50:1",
      "areaBasedSyncList2:50:1:1",
      "detailCommon2:2704412",
    ]);
    expect(stdout).toHaveLength(4);

    const payloads = stdout.map(parseOutput);
    expect(payloads.map((payload) => payload.operation)).toEqual([
      "ldongCode2",
      "areaBasedList2",
      "areaBasedSyncList2",
      "detailCommon2",
    ]);
    expect(payloads[3]).toMatchObject({
      sampleContentId: "2704412",
      hasOverview: true,
      hasHomepage: true,
    });
    for (const payload of payloads) {
      expect(
        Object.keys(payload).every((key) => ALLOWED_OUTPUT_KEYS.has(key)),
      ).toBe(true);
    }
    expectSafeText(stdout.join("\n"));
  });

  it("returns nonzero with a safe error when the detail content ID is empty", async () => {
    const direct = createProvider("   ");

    await expect(
      runTourismSmoke(direct.provider, () => undefined),
    ).rejects.toThrow(SAFE_DETAIL_MISMATCH);

    const { provider, calls } = createProvider("   ");
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await executeTourismSmoke(
      provider,
      (message) => stdout.push(message),
      (message) => stderr.push(message),
    );

    expect(exitCode).toBe(1);
    expect(stderr).toEqual([SAFE_ERROR]);
    expect(stdout).toHaveLength(3);
    expect(calls.at(-1)).toBe("detailCommon2:2704412");
    expectSafeText(stderr.join("\n"));
  });

  it("throws a safe mismatch error and returns nonzero for a different detail content ID", async () => {
    const direct = createProvider("9999999");

    await expect(
      runTourismSmoke(direct.provider, () => undefined),
    ).rejects.toThrow(SAFE_DETAIL_MISMATCH);

    const command = createProvider("9999999");
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await executeTourismSmoke(
      command.provider,
      (message) => stdout.push(message),
      (message) => stderr.push(message),
    );

    expect(exitCode).toBe(1);
    expect(stderr).toEqual([SAFE_ERROR]);
    expect(stdout).toHaveLength(3);
    expect(command.calls.at(-1)).toBe("detailCommon2:2704412");
    expectSafeText(stderr.join("\n"));
  });
});
