/* eslint-disable @typescript-eslint/require-await -- deterministic fake service preserves the async command interface */
import {
  executeFestivalSync,
  FESTIVAL_SYNC_RANGE,
} from "./festival-sync.command.js";

describe("festival sync command", () => {
  it("runs the approved fixed range and prints a safe JSON summary", async () => {
    const calls: unknown[] = [];
    const output: string[] = [];
    const errors: string[] = [];
    const service = {
      fullSync: async (range: unknown) => {
        calls.push(range);
        return {
          runId: "run-1",
          status: "SUCCEEDED" as const,
          fetchedCount: 38,
          insertedCount: 38,
          updatedCount: 0,
          deactivatedCount: 2,
          failedCount: 0 as const,
        };
      },
    };

    const exitCode = await executeFestivalSync(
      service,
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(calls).toEqual([FESTIVAL_SYNC_RANGE]);
    expect(JSON.parse(output[0] ?? "")).toEqual({
      jobType: "FESTIVAL_FULL",
      status: "SUCCEEDED",
      rangeStart: "2026-01-01",
      rangeEnd: "2027-12-31",
      fetchedCount: 38,
      insertedCount: 38,
      updatedCount: 0,
      deactivatedCount: 2,
      failedCount: 0,
      runId: "run-1",
    });
    expect(errors).toHaveLength(0);
  });

  it("returns a failure exit code when the list succeeds but details fail", async () => {
    const code = await executeFestivalSync(
      {
        fullSync: async () => ({
          runId: "partial",
          status: "SUCCEEDED",
          fetchedCount: 1,
          insertedCount: 1,
          updatedCount: 0,
          deactivatedCount: 0,
          failedCount: 1,
        }),
      },
      () => undefined,
      () => undefined,
    );
    expect(code).toBe(1);
  });

  it("returns a failure code without exposing service errors", async () => {
    const secret = "SERVICE_KEY=do-not-leak";
    const output: string[] = [];
    const errors: string[] = [];
    const service = {
      fullSync: async () => {
        throw new Error(secret);
      },
    };

    const exitCode = await executeFestivalSync(
      service,
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(1);
    expect(output).toHaveLength(0);
    expect(errors).toEqual(["Festival sync command failed."]);
    expect(JSON.stringify(errors)).not.toContain(secret);
  });
});
