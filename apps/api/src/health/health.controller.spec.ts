import { jest } from "@jest/globals";

import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("returns the Terminus database health result", async () => {
    const up = { database: { status: "up" as const } };
    const health = {
      check: jest.fn(async (indicators: Array<() => Promise<typeof up>>) => {
        const result = await indicators[0]();
        return { status: "ok", info: result, error: {}, details: result };
      }),
    };
    const prismaHealth = {
      pingCheck: jest
        .fn<
          (
            key: string,
            client: object,
            options: { timeout: number },
          ) => Promise<typeof up>
        >()
        .mockResolvedValue(up),
    };
    const prisma = {};

    const controller = new HealthController(
      health as never,
      prismaHealth as never,
      prisma as never,
    );

    await expect(controller.check()).resolves.toEqual({
      status: "ok",
      info: up,
      error: {},
      details: up,
    });
    expect(prismaHealth.pingCheck).toHaveBeenCalledWith("database", prisma, {
      timeout: 1000,
    });
  });
});
