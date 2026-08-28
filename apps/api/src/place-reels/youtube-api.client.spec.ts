import { jest } from "@jest/globals";

import { YouTubeApiClient, YouTubeApiError } from "./youtube-api.client.js";

type FetchMock = jest.Mock<
  (input: URL, init?: RequestInit) => Promise<Response>
>;
type SleepMock = jest.Mock<(milliseconds: number) => Promise<void>>;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function searchResponse(ids: string[]) {
  return {
    items: ids.map((videoId) => ({
      id: { kind: "youtube#video", videoId },
      snippet: { title: `${videoId} title`, channelTitle: "채널" },
    })),
  };
}

function videoItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "video-1",
    snippet: {
      title: "성산일출봉 브이로그",
      channelTitle: "여행 채널",
      publishedAt: "2026-08-20T21:00:00.000Z",
      thumbnails: { high: { url: "https://i.ytimg.com/vi/video-1/hq.jpg" } },
    },
    contentDetails: { duration: "PT45S" },
    statistics: { viewCount: "12345" },
    status: { embeddable: true },
    ...overrides,
  };
}

function createClient(apiKey = "youtube-test-key") {
  const fetch: FetchMock = jest.fn();
  const sleep: SleepMock = jest.fn(() => Promise.resolve());
  const config = { get: jest.fn(() => (apiKey === "" ? undefined : apiKey)) };
  return {
    client: new YouTubeApiClient(config as never, fetch, sleep),
    fetch,
    sleep,
  };
}

describe("YouTubeApiClient", () => {
  it("fails fast when the API key is not configured", async () => {
    const { client, fetch } = createClient("");

    await expect(
      client.searchPlaceShorts({
        query: "성산일출봉 제주 여행",
        maxResults: 5,
      }),
    ).rejects.toMatchObject({ providerCode: "MISSING_CONFIGURATION" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an empty list when search finds nothing", async () => {
    const { client, fetch } = createClient();
    fetch.mockResolvedValueOnce(jsonResponse({ items: [] }));

    await expect(
      client.searchPlaceShorts({ query: "없는장소 여행", maxResults: 5 }),
    ).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps only embeddable shorts within the duration limit, in search order", async () => {
    const { client, fetch } = createClient();
    fetch
      .mockResolvedValueOnce(
        jsonResponse(
          searchResponse(["keep-1", "too-long", "not-embed", "keep-2"]),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            videoItem({ id: "keep-2", contentDetails: { duration: "PT58S" } }),
            videoItem({
              id: "too-long",
              contentDetails: { duration: "PT3M2S" },
            }),
            videoItem({ id: "not-embed", status: { embeddable: false } }),
            videoItem({ id: "keep-1" }),
          ],
        }),
      );

    const shorts = await client.searchPlaceShorts({
      query: "성산일출봉 제주 여행",
      maxResults: 5,
    });

    expect(shorts.map((short) => short.videoId)).toEqual(["keep-1", "keep-2"]);
    expect(shorts[0]).toMatchObject({
      title: "성산일출봉 브이로그",
      durationSeconds: 45,
      viewCount: 12345,
      channelTitle: "여행 채널",
      thumbnailUrl: "https://i.ytimg.com/vi/video-1/hq.jpg",
    });
    expect(shorts[0]?.publishedAt).toBeInstanceOf(Date);
  });

  it("caps the result at maxResults", async () => {
    const { client, fetch } = createClient();
    fetch
      .mockResolvedValueOnce(jsonResponse(searchResponse(["a", "b", "c"])))
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            videoItem({ id: "a" }),
            videoItem({ id: "b" }),
            videoItem({ id: "c" }),
          ],
        }),
      );

    const shorts = await client.searchPlaceShorts({
      query: "q",
      maxResults: 2,
    });

    expect(shorts.map((short) => short.videoId)).toEqual(["a", "b"]);
  });

  it("retries a transient 503 before succeeding", async () => {
    const { client, fetch, sleep } = createClient();
    fetch
      .mockResolvedValueOnce(
        jsonResponse({ error: { status: "UNAVAILABLE" } }, 503),
      )
      .mockResolvedValueOnce(jsonResponse(searchResponse(["a"])))
      .mockResolvedValueOnce(jsonResponse({ items: [videoItem({ id: "a" })] }));

    const shorts = await client.searchPlaceShorts({
      query: "q",
      maxResults: 5,
    });

    expect(shorts.map((short) => short.videoId)).toEqual(["a"]);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("surfaces a non-retryable 403 as a YouTubeApiError", async () => {
    const { client, fetch } = createClient();
    fetch.mockResolvedValue(
      jsonResponse({ error: { errors: [{ reason: "quotaExceeded" }] } }, 403),
    );

    await expect(
      client.searchPlaceShorts({ query: "q", maxResults: 5 }),
    ).rejects.toBeInstanceOf(YouTubeApiError);
  });
});
