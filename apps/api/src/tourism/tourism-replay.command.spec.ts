import { safeReplayStopReason } from "./tourism-replay.command.js";
import { TourApiBudgetDeferredError } from "./tour-api-policy.js";
import { parseReplayArguments } from "./tourism-replay.command.js";
describe("bounded replay arguments", () => {
  it("defaults to no HTTP and a bounded result set", () => {
    expect(parseReplayArguments(["--job=tourism"])).toEqual({
      job: "tourism",
      ids: [],
      limit: 20,
      fetchMissing: false,
      maxRequests: 0,
      requeue: false,
    });
  });
  it.each([
    ["--limit=0"],
    ["--limit=101"],
    ["--ids=a"],
    ["--ids=1,,2"],
    ["--max-requests=2"],
    ["--fetch-missing"],
    ["--fetch-missing", "--max-requests=101"],
    ["--requeue"],
  ])("rejects unbounded or ambiguous options %j", (arg, ...rest) => {
    expect(() =>
      parseReplayArguments(["--job=tourism", arg, ...rest]),
    ).toThrow();
  });
  it("accepts explicit bounded missing-fetch and quarantine requeue", () => {
    expect(
      parseReplayArguments([
        "--job=festival",
        "--ids=12,34",
        "--limit=2",
        "--fetch-missing",
        "--max-requests=6",
        "--requeue",
      ]),
    ).toMatchObject({
      job: "festival",
      ids: ["12", "34"],
      limit: 2,
      fetchMissing: true,
      maxRequests: 6,
      requeue: true,
    });
  });
});

it("reports an allowlisted replay stop reason without raw error data", () => {
  expect(
    safeReplayStopReason(
      new TourApiBudgetDeferredError("TOUR_API_PROVIDER_COOLDOWN"),
    ),
  ).toBe("TOUR_API_PROVIDER_COOLDOWN");
  expect(safeReplayStopReason(new Error("https://secret"))).toBe(
    "PROCESSING_FAILED",
  );
});
