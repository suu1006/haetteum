/* eslint-disable @typescript-eslint/require-await -- deterministic fake services preserve the async command interface */
import { executeRankingImageBackfill } from "./ranking-image-backfill.command.js";

describe("ranking image backfill command", () => {
  it("prints one JSON summary with both ranking results", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const placeRankings = {
      backfillDisplayImages: async () => ({ scanned: 12, updated: 9 }),
    };
    const hotPlaceRankings = {
      backfillDisplayImages: async () => ({ scanned: 8, updated: 3 }),
    };

    const exitCode = await executeRankingImageBackfill(
      placeRankings,
      hotPlaceRankings,
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(errors).toHaveLength(0);
    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0] ?? "")).toEqual({
      placeRankingsSummary: { scanned: 12, updated: 9 },
      hotPlaceRankingsSummary: { scanned: 8, updated: 3 },
    });
  });

  it("returns a failure code with a safe message when a backfill throws", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const placeRankings = {
      backfillDisplayImages: async () => ({ scanned: 0, updated: 0 }),
    };
    const hotPlaceRankings = {
      backfillDisplayImages: async () => {
        throw new Error("raw prisma detail should not leak");
      },
    };

    await expect(
      executeRankingImageBackfill(
        placeRankings,
        hotPlaceRankings,
        (message) => output.push(message),
        (message) => errors.push(message),
      ),
    ).resolves.toBe(1);
    expect(output).toHaveLength(0);
    expect(errors).toEqual(["Ranking image backfill command failed."]);
  });
});
