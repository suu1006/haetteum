import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPublicWebEnvironment,
  logPublicWebEnvironmentStatus,
  validatePublicWebEnvironment,
} from "@/lib/environment-contract";

describe("validatePublicWebEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    "https://user:password@media.example.com/weekly",
    "https://media.example.com/weekly?token=private",
    "https://media.example.com/weekly#fragment",
  ])("warns when the thumbnail base cannot be used: %s", (base) => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/api/v1");
    vi.stubEnv("NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL", base);
    const result = validatePublicWebEnvironment();
    expect(result.contract.weeklyThumbnailBaseUrl.valid).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("invalid"))).toBe(true);
    expect(result.warnings.join(" ")).not.toContain(base);
  });

  it("validates required API base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "abc");
    vi.stubEnv("NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL", "https://media.example.com/uploads/weekly");

    const result = validatePublicWebEnvironment();

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(getPublicWebEnvironment()).toEqual({
      apiBaseUrl: "http://localhost:4000/api/v1",
      kakaoJsKey: "abc",
      weeklyThumbnailBaseUrl: "https://media.example.com/uploads/weekly",
    });
  });

  it("returns errors for missing required API base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);

    const result = validatePublicWebEnvironment();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "NEXT_PUBLIC_API_BASE_URL is required. Set it in apps/web/.env.local.",
    );
  });

  it("returns errors for invalid required API base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "not-a-url");

    const result = validatePublicWebEnvironment();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("NEXT_PUBLIC_API_BASE_URL must be a valid http(s) URL.");
  });

  it("warns for optional missing Kakao and thumbnail keys", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL", undefined);

    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logs = logPublicWebEnvironmentStatus();

    expect(logs.valid).toBe(true);
    expect(warnings).toHaveBeenCalledWith(
      expect.stringContaining("NEXT_PUBLIC_KAKAO_JS_KEY is not set."),
    );
  });
});
