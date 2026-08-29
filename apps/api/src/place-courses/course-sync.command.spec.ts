/* eslint-disable @typescript-eslint/require-await -- deterministic fake service preserves the async command interface */
import { executeCourseSync } from "./course-sync.command.js";
import type { CourseSyncSummary } from "./course-sync.service.js";

const summary: CourseSyncSummary = {
  enabled: true,
  listedCourses: 1069,
  syncedCourses: 995,
  syncedStops: 4210,
  linkedStops: 1161,
  emptyCourses: 74,
  failedCourses: 0,
};

describe("course sync command", () => {
  it("passes the parsed limit and prints one JSON summary", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const calls: unknown[] = [];
    const service = {
      syncCourses: async (options: unknown) => {
        calls.push(options);
        return summary;
      },
    };

    const exitCode = await executeCourseSync(
      service,
      ["--limit=25"],
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(calls).toEqual([{ limit: 25 }]);
    expect(JSON.parse(output[0] ?? "")).toMatchObject({ syncedCourses: 995 });
    expect(errors).toHaveLength(0);
  });

  it("syncs every course when no limit flag is supplied", async () => {
    const calls: unknown[] = [];
    const service = {
      syncCourses: async (options: unknown) => {
        calls.push(options);
        return summary;
      },
    };

    const exitCode = await executeCourseSync(
      service,
      [],
      () => undefined,
      () => undefined,
    );

    expect(exitCode).toBe(0);
    expect(calls).toEqual([{ limit: undefined }]);
  });

  it("reports a non-zero exit code without leaking provider detail on failure", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const service = {
      syncCourses: async () => {
        throw new Error("SERVICE_KEY rejected");
      },
    };

    const exitCode = await executeCourseSync(
      service,
      [],
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(1);
    expect(output).toHaveLength(0);
    expect(errors).toEqual(["Course sync command failed."]);
  });

  it("rejects a limit outside the accepted range", async () => {
    const errors: string[] = [];
    const service = { syncCourses: async () => summary };

    const exitCode = await executeCourseSync(
      service,
      ["--limit", "0"],
      () => undefined,
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(1);
    expect(errors).toEqual(["Course sync command failed."]);
  });
});
