import {
  parseInspectArguments,
  executeInspect,
} from "./tourism-inspect.command.js";

describe("safe recovery inspection", () => {
  it("bounds and validates job, IDs and limit without accepting mutating options", () => {
    expect(parseInspectArguments(["--job=festival"])).toEqual({
      job: "festival",
      ids: [],
      limit: 20,
    });
    for (const args of [
      ["--job=bad"],
      ["--job=tourism", "--limit=101"],
      ["--job=tourism", "--ids=1,1"],
      ["--job=tourism", "--fetch-missing"],
      ["--job=tourism", "--requeue"],
    ])
      expect(() => parseInspectArguments(args)).toThrow();
  });
  it("emits only safe projected metadata, never bodies or arbitrary DB field values", async () => {
    const output: string[] = [];
    await executeInspect(
      { job: "tourism", ids: [], limit: 1 },
      {
        inspectCurrent: () =>
          Promise.resolve([
            {
              job: "tourism",
              contentId: "123",
              sourceVersion: "2026-09-01T00:00:00.000Z",
              state: "FAILED",
              stage: "https://secret",
              code: "private",
              attemptCount: 1,
              nextAttemptAt: new Date("2026-09-21T00:00:00Z"),
              body: "private response",
            },
          ]),
      },
      (value) => output.push(value),
    );
    expect(JSON.parse(output[0])).toEqual({
      job: "tourism",
      count: 1,
      items: [
        {
          job: "tourism",
          contentId: "123",
          sourceVersion: "2026-09-01T00:00:00.000Z",
          state: "FAILED",
          stage: "PROCESSING",
          code: "PROCESSING_FAILED",
          attemptCount: 1,
          nextAttemptAt: "2026-09-21T00:00:00.000Z",
        },
      ],
    });
    expect(output[0]).not.toMatch(/secret|private|body/);
  });
});
