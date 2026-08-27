import { jest } from "@jest/globals";
import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import { SameOriginGuard } from "./same-origin.guard.js";

function createGuard(
  method: string,
  origin: string | undefined,
  referer?: string,
) {
  const config = {
    get: jest.fn(() => "http://localhost:3000"),
  } as unknown as ConfigService<ApiEnvironment, true>;
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers: { origin, referer },
      }),
    }),
  } as unknown as ExecutionContext;

  return { guard: new SameOriginGuard(config), context };
}

describe("SameOriginGuard", () => {
  it.each(["GET", "HEAD", "OPTIONS"])(
    "allows safe %s requests without Origin",
    (method) => {
      const { guard, context } = createGuard(method, undefined);

      expect(guard.canActivate(context)).toBe(true);
    },
  );

  it("allows an unsafe request only when Origin exactly equals WEB_ORIGIN", () => {
    const { guard, context } = createGuard("POST", "http://localhost:3000");

    expect(guard.canActivate(context)).toBe(true);
  });

  it.each([
    ["a missing Origin", undefined, "http://localhost:3000/reviews"],
    ["a mismatched Origin", "http://localhost:3000/", undefined],
  ])("rejects unsafe requests with %s", (_scenario, origin, referer) => {
    const { guard, context } = createGuard("PATCH", origin, referer);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    try {
      guard.canActivate(context);
    } catch (error) {
      expect((error as ForbiddenException).getStatus()).toBe(403);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: "FORBIDDEN_ORIGIN",
      });
    }
  });
});
