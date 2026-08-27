import { describe, expect, it } from "vitest";

import {
  loginErrorMessage,
  safeReturnTo,
} from "@/features/auth/auth-model";

describe("safeReturnTo", () => {
  it("keeps an internal path and query for post-login navigation", () => {
    expect(safeReturnTo("/reviews?source=kakao")).toBe(
      "/reviews?source=kakao",
    );
  });

  it.each(["https://evil.example", "//evil.example", "\\\\evil.example"]) (
    "falls back to home for an external return target of %s",
    (returnTo) => {
      expect(safeReturnTo(returnTo)).toBe("/");
    },
  );

  it.each([
    ...Array.from(
      { length: 32 },
      (_, code) => `/safe${String.fromCharCode(code)}path`,
    ),
    `/safe${String.fromCharCode(127)}path`,
    ...Array.from(
      { length: 32 },
      (_, code) => `/safe%${code.toString(16).padStart(2, "0")}path`,
    ),
    "/safe%7fpath",
  ])("falls back to home for an ASCII control character in %p", (returnTo) => {
    expect(safeReturnTo(returnTo)).toBe("/");
  });

  it.each(["/\r/evil.example", "/\n/evil.example", "/\t/evil.example", "/%0A/evil.example"]) (
    "rejects a line-control return target of %p",
    (returnTo) => {
      expect(safeReturnTo(returnTo)).toBe("/");
    },
  );
});

describe("loginErrorMessage", () => {
  it.each([
    ["cancelled", "카카오 로그인이 취소되었어요. 다시 시도해 주세요."],
    ["invalid_request", "로그인 요청을 확인할 수 없어요. 다시 시도해 주세요."],
    [
      "provider_unavailable",
      "카카오 로그인에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
    ],
  ] as const)("shows safe Korean guidance for %s", (error, message) => {
    expect(loginErrorMessage(error)).toBe(message);
  });

  it("does not expose an unrecognized provider error", () => {
    expect(loginErrorMessage("token=secret")).toBeNull();
  });
});
