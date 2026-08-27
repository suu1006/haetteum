/* eslint-disable @typescript-eslint/require-await -- deterministic fake service preserves the async command interface */
import { executePlaceRankingImport } from "./place-ranking-import.command.js";

describe("place ranking import command", () => {
  it("accepts a separate directory argument and prints one safe JSON summary", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const directories: string[] = [];
    const service = {
      importDirectory: async (directory: string) => {
        directories.push(directory);
        return {
          source: "KTO_DATALAB",
          scope: "NATIONAL",
          periodStart: "2025-08-01",
          periodEnd: "2026-07-31",
          audienceCount: 6,
          importedCount: 180,
          matchedCount: 1,
          unmatchedCount: 179,
        };
      },
    };

    const exitCode = await executePlaceRankingImport(
      service,
      ["--directory", "/tmp/rankings"],
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(directories).toEqual(["/tmp/rankings"]);
    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0] ?? "")).toMatchObject({ importedCount: 180 });
    expect(errors).toHaveLength(0);
  });

  it("accepts an equals directory argument", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const directories: string[] = [];
    const service = {
      importDirectory: async (directory: string) => {
        directories.push(directory);
        return {
          source: "KTO_DATALAB",
          scope: "NATIONAL",
          periodStart: "2025-08-01",
          periodEnd: "2026-07-31",
          audienceCount: 6,
          importedCount: 180,
          matchedCount: 1,
          unmatchedCount: 179,
        };
      },
    };

    const exitCode = await executePlaceRankingImport(
      service,
      ["--directory=/tmp/rankings"],
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(directories).toEqual(["/tmp/rankings"]);
    expect(JSON.parse(output[0] ?? "")).toMatchObject({ importedCount: 180 });
    expect(errors).toHaveLength(0);
  });

  it("returns a failure code without printing the directory or service errors", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const service = {
      importDirectory: async () => {
        throw new Error("raw row /tmp/rankings should not leak");
      },
    };

    await expect(
      executePlaceRankingImport(
        service,
        [],
        (message) => output.push(message),
        (message) => errors.push(message),
      ),
    ).resolves.toBe(1);
    expect(output).toHaveLength(0);
    expect(errors).toEqual(["Place ranking import command failed."]);
    expect(JSON.stringify(errors)).not.toContain("/tmp/rankings");
  });
});
