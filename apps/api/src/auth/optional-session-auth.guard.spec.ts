import { jest } from "@jest/globals";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { OptionalSessionAuthGuard } from "./optional-session-auth.guard.js";
import type { SessionAuthGuard } from "./session-auth.guard.js";

const context = {} as ExecutionContext;
describe("OptionalSessionAuthGuard", () => {
  it("accepts anonymous visitors when the session guard rejects authentication", async () => {
    const canActivate = jest
      .fn<() => Promise<boolean>>()
      .mockRejectedValue(new UnauthorizedException());
    const guard = new OptionalSessionAuthGuard({
      canActivate,
    } as unknown as SessionAuthGuard);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(canActivate).toHaveBeenCalledWith(context);
  });
  it("preserves session resolution and refresh for authenticated visitors", async () => {
    const canActivate = jest
      .fn<() => Promise<boolean>>()
      .mockResolvedValue(true);
    await expect(
      new OptionalSessionAuthGuard({
        canActivate,
      } as unknown as SessionAuthGuard).canActivate(context),
    ).resolves.toBe(true);
    expect(canActivate).toHaveBeenCalledWith(context);
  });
  it("does not turn a database failure into an anonymous session", async () => {
    const error = new Error("database unavailable");
    const canActivate = jest
      .fn<() => Promise<boolean>>()
      .mockRejectedValue(error);
    await expect(
      new OptionalSessionAuthGuard({
        canActivate,
      } as unknown as SessionAuthGuard).canActivate(context),
    ).rejects.toBe(error);
  });
});
