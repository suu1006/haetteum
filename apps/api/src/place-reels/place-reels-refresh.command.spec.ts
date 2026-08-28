/* eslint-disable @typescript-eslint/require-await -- deterministic fake service preserves the async command interface */
import { executePlaceReelsRefresh } from "./place-reels-refresh.command.js";
import type { PlaceReelsRefreshSummary } from "./place-reels-refresh.service.js";

const summary: PlaceReelsRefreshSummary = {
  enabled: true,
  audience: "all",
  processedPlaces: 3,
  insertedReels: 12,
  emptyPlaces: 1,
  failedPlaces: 0,
};

describe("place reels refresh command", () => {
  it("passes parsed audience and limit options and prints one JSON summary", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const calls: unknown[] = [];
    const service = {
      refreshRankedPlaces: async (options: unknown) => {
        calls.push(options);
        return summary;
      },
    };

    const exitCode = await executePlaceReelsRefresh(
      service,
      ["--audience", "30s", "--limit=5"],
      (message) => output.push(message),
      (message) => errors.push(message),
    );

    expect(exitCode).toBe(0);
    expect(calls).toEqual([{ audience: "30s", limit: 5 }]);
    expect(JSON.parse(output[0] ?? "")).toMatchObject({ insertedReels: 12 });
    expect(errors).toHaveLength(0);
  });

  it("defaults options when no flags are supplied", async () => {
    const calls: unknown[] = [];
    const service = {
      refreshRankedPlaces: async (options: unknown) => {
        calls.push(options);
        return summary;
      },
    };

    await executePlaceReelsRefresh(
      service,
      [],
      () => undefined,
      () => undefined,
    );

    expect(calls).toEqual([{ audience: undefined, limit: undefined }]);
  });

  it("returns a failure code and a generic message when the service throws", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const service = {
      refreshRankedPlaces: async () => {
        throw new Error("YOUTUBE_API_KEY abc123 must not leak");
      },
    };

    await expect(
      executePlaceReelsRefresh(
        service,
        [],
        (message) => output.push(message),
        (message) => errors.push(message),
      ),
    ).resolves.toBe(1);
    expect(output).toHaveLength(0);
    expect(errors).toEqual(["Place reels refresh command failed."]);
    expect(JSON.stringify(errors)).not.toContain("abc123");
  });

  it("rejects an unknown audience with a failure code", async () => {
    const service = { refreshRankedPlaces: async () => summary };

    await expect(
      executePlaceReelsRefresh(
        service,
        ["--audience", "teens"],
        () => undefined,
        () => undefined,
      ),
    ).resolves.toBe(1);
  });
});
