import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadCurrentUser,
  logout,
} from "@/features/auth/auth-client";

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "해뜸 여행자",
  profileImageUrl: null,
  provider: "KAKAO",
};

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
  }
});

describe("loadCurrentUser", () => {
  it("loads and validates the current user with browser credentials", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(user), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadCurrentUser()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/auth/me",
      { credentials: "include", cache: "no-store" },
    );
  });

  it("maps an unauthenticated response to no user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(loadCurrentUser()).resolves.toBeNull();
  });
});

describe("logout", () => {
  it("revokes the current browser session with the approved empty JSON request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/auth/logout",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );
  });

  it("does not treat a non-204 logout response as success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })),
    );

    await expect(logout()).rejects.toThrow("Unable to log out.");
  });
});
