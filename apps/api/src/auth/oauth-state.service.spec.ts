import { OAuthStateService } from "./oauth-state.service.js";

describe("OAuthStateService", () => {
  const now = new Date("2026-08-26T12:00:00.000Z").getTime();

  function createService(currentTime = now) {
    return new OAuthStateService(() => currentTime);
  }

  it("keeps only safe internal return paths", () => {
    const service = createService();

    expect(service.sanitizeReturnTo("/reviews?tab=written")).toBe(
      "/reviews?tab=written",
    );
    expect(service.sanitizeReturnTo("https://evil.example")).toBe("/");
    expect(service.sanitizeReturnTo("//evil.example/path")).toBe("/");
  });

  it.each([
    "/%0A/evil.example",
    "/\r/evil.example",
    "/\n/evil.example",
    "/\t/evil.example",
  ])(
    "rejects encoded and literal line controls in returnTo (%p)",
    (returnTo) => {
      const service = createService();

      expect(service.sanitizeReturnTo(returnTo)).toBe("/");
    },
  );

  it.each([
    ...Array.from(
      { length: 32 },
      (_, code) => `/safe${String.fromCharCode(code)}path`,
    ),
    `/safe${String.fromCharCode(127)}path`,
  ])("rejects every ASCII control character in returnTo", (returnTo) => {
    const service = createService();

    expect(service.sanitizeReturnTo(returnTo)).toBe("/");
  });

  it("creates an opaque state and consumes the matching cookie payload", () => {
    const service = createService();
    const attempt = service.create("/reviews");

    expect(attempt.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(service.consume(attempt.state, attempt.cookieValue)).toEqual({
      returnTo: "/reviews",
    });
  });

  it("rejects a callback state that does not match the cookie state", () => {
    const service = createService();
    const attempt = service.create("/reviews");

    expect(() => service.consume("different", attempt.cookieValue)).toThrow(
      "OAUTH_STATE_INVALID",
    );
  });

  it("rejects a state cookie older than ten minutes", () => {
    const state = "A".repeat(43);
    const cookieValue = Buffer.from(
      JSON.stringify({ state, returnTo: "/reviews", createdAt: now - 600_001 }),
    ).toString("base64url");
    const service = createService();

    expect(() => service.consume(state, cookieValue)).toThrow(
      "OAUTH_STATE_EXPIRED",
    );
  });

  it.each([
    undefined,
    "not-base64",
    Buffer.from("not-json").toString("base64url"),
  ])("rejects an absent or malformed state cookie safely", (cookieValue) => {
    const service = createService();

    expect(() => service.consume("A".repeat(43), cookieValue)).toThrow(
      "OAUTH_STATE_INVALID",
    );
  });

  it("rejects a cookie with non-base64url characters", () => {
    const service = createService();
    const attempt = service.create("/reviews");

    expect(() =>
      service.consume(attempt.state, `${attempt.cookieValue}!`),
    ).toThrow("OAUTH_STATE_INVALID");
  });
});
