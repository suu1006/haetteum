/* eslint-disable @typescript-eslint/require-await -- deterministic fake service preserves the async command interface */
import { executeHotPlaceRankingImport } from "./hot-place-ranking-import.command.js";

const summary = {
  source: "KTO_DATALAB",
  scope: "NATIONAL",
  baseYearMonth: "202607",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  audienceCount: 6,
  importedCount: 60,
  matchedCount: 4,
  unmatchedCount: 56,
};

describe("hot place ranking import command", () => {
  it("accepts a separate directory argument and prints one safe JSON summary", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const directories: string[] = [];
    const service = {
      importDirectory: async (directory: string) => {
        directories.push(directory);
        return summary;
      },
    };

    const exitCode = await executeHotPlaceRankingImport(
      service,
      ["--directory", "/tmp/hot"],
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(directories).toEqual(["/tmp/hot"]);
    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0] ?? "")).toMatchObject({
      baseYearMonth: "202607",
      importedCount: 60,
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts an equals directory argument", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const directories: string[] = [];
    const service = {
      importDirectory: async (directory: string) => {
        directories.push(directory);
        return summary;
      },
    };

    const exitCode = await executeHotPlaceRankingImport(
      service,
      ["--directory=/tmp/hot"],
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(directories).toEqual(["/tmp/hot"]);
    expect(JSON.parse(output[0] ?? "")).toMatchObject({ importedCount: 60 });
    expect(errors).toHaveLength(0);
  });

  it("returns a failure code without leaking the directory or service errors", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const service = {
      importDirectory: async () => {
        throw new Error("raw row /tmp/hot should not leak");
      },
    };

    await expect(
      executeHotPlaceRankingImport(
        service,
        [],
        (message) => output.push(message),
        (message) => errors.push(message),
      ),
    ).resolves.toBe(1);
    expect(output).toHaveLength(0);
    expect(errors).toEqual(["Hot place ranking import command failed."]);
    expect(JSON.stringify(errors)).not.toContain("/tmp/hot");
  });
});
