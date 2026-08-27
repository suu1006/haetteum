import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  loadCurrentUser,
  requireCurrentUser,
} from "@/features/auth/auth-server";

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "해뜸 여행자",
  profileImageUrl: "https://example.test/profile.jpg",
};

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
  vi.mocked(headers).mockResolvedValue(
    new Headers({ Cookie: "haetteum_session=opaque-session" }) as never,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
  }
});

describe("loadCurrentUser", () => {
  it("forwards the incoming cookie to a non-cached auth request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(user), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadCurrentUser()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/auth/me",
      {
        cache: "no-store",
        headers: { Cookie: "haetteum_session=opaque-session" },
      },
    );
  });

  it("returns null for an unauthenticated session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(loadCurrentUser()).resolves.toBeNull();
  });

  it("does not expose upstream failure details", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("database connection string", { status: 503 })),
    );

    await expect(loadCurrentUser()).rejects.toThrow(
      "Unable to load current user.",
    );
  });
});

describe("requireCurrentUser", () => {
  it("redirects an anonymous request to its encoded internal return path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })),
    );
    vi.mocked(redirect).mockImplementation((url) => {
      throw new Error(`redirected:${url}`);
    });

    await expect(requireCurrentUser("/reviews?source=kakao")).rejects.toThrow(
      "redirected:/login?returnTo=%2Freviews%3Fsource%3Dkakao",
    );
  });
});
