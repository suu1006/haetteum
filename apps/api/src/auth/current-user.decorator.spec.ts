import type { AuthUser } from "@haetteum/contracts";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import type { ExecutionContext } from "@nestjs/common";

import { CurrentUser } from "./current-user.decorator.js";

type DecoratorMetadata = {
  factory: (data: unknown, context: ExecutionContext) => unknown;
};

class AuthenticatedController {
  handler(@CurrentUser() user: AuthUser): void {
    void user;
  }
}

describe("CurrentUser", () => {
  it("returns only the user attached by SessionAuthGuard, not client-supplied identity", () => {
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      AuthenticatedController,
      "handler",
    ) as Record<string, DecoratorMetadata>;
    const [{ factory }] = Object.values(metadata);
    const guardedUser = {
      id: "10000000-0000-4000-8000-000000000001",
      displayName: "해뜸 여행자",
      profileImageUrl: null,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          body: { userId: "99999999-0000-4000-8000-000000000001" },
          auth: { user: guardedUser },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(factory(undefined, context)).toEqual(guardedUser);
  });
});
