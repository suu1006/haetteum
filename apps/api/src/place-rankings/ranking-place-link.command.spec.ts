/* eslint-disable @typescript-eslint/require-await -- deterministic fake services preserve the async command interface */
import { executeRankingPlaceLink } from "./ranking-place-link.command.js";

describe("ranking place link command", () => {
  it("prints one JSON summary with both ranking results", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const placeRankings = {
      backfillPlaceLinks: async () => ({ scanned: 14, linked: 11 }),
    };
    const hotPlaceRankings = {
      backfillPlaceLinks: async () => ({ scanned: 9, linked: 6 }),
    };

    const exitCode = await executeRankingPlaceLink(
      placeRankings,
      hotPlaceRankings,
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(errors).toHaveLength(0);
    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0] ?? "")).toEqual({
      placeRankingsSummary: { scanned: 14, linked: 11 },
      hotPlaceRankingsSummary: { scanned: 9, linked: 6 },
    });
  });

  it("returns a failure code with a safe message when a backfill throws", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const placeRankings = {
      backfillPlaceLinks: async () => ({ scanned: 0, linked: 0 }),
    };
    const hotPlaceRankings = {
      backfillPlaceLinks: async () => {
        throw new Error("raw prisma detail should not leak");
      },
    };

    await expect(
      executeRankingPlaceLink(
        placeRankings,
        hotPlaceRankings,
        (message) => output.push(message),
        (message) => errors.push(message),
      ),
    ).resolves.toBe(1);
    expect(output).toHaveLength(0);
    expect(errors).toEqual(["Ranking place link command failed."]);
  });
});
