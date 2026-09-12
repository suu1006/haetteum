import { describe, expect, it } from "vitest";

import {
  getApiBaseUrl,
  getServerApiBaseUrl,
  normalizeApiBaseUrl,
} from "@/lib/api-base";

describe("normalizeApiBaseUrl", () => {
  it("trims whitespace and trailing slashes", () => {
    expect(normalizeApiBaseUrl("  http://localhost:4000/api/v1///  ")).toBe(
      "http://localhost:4000/api/v1",
    );
  });

  it("returns empty string for blank input", () => {
    expect(normalizeApiBaseUrl("   ")).toBe("");
  });
});

describe("getApiBaseUrl", () => {
  it("reads NEXT_PUBLIC_API_BASE_URL", () => {
    const previousValue = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";

    expect(getApiBaseUrl()).toBe("http://localhost:4000/api/v1");

    process.env.NEXT_PUBLIC_API_BASE_URL = previousValue;
  });
});

describe("getServerApiBaseUrl", () => {
  it("uses API_BASE_URL first for server calls", () => {
    const previousPublic = process.env.NEXT_PUBLIC_API_BASE_URL;
    const previousPrivate = process.env.API_BASE_URL;
    process.env.API_BASE_URL = "http://localhost:5000/api/v1/";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";

    expect(getServerApiBaseUrl()).toBe("http://localhost:5000/api/v1");

    process.env.API_BASE_URL = previousPrivate;
    process.env.NEXT_PUBLIC_API_BASE_URL = previousPublic;
  });

  it("falls back to NEXT_PUBLIC_API_BASE_URL for server calls", () => {
    const previousPublic = process.env.NEXT_PUBLIC_API_BASE_URL;
    const previousPrivate = process.env.API_BASE_URL;
    process.env.API_BASE_URL = undefined;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";

    expect(getServerApiBaseUrl()).toBe("http://localhost:4000/api/v1");

    process.env.API_BASE_URL = previousPrivate;
    process.env.NEXT_PUBLIC_API_BASE_URL = previousPublic;
  });
});
