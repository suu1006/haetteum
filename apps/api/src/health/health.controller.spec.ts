import { jest } from "@jest/globals";

import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  function harness() {
    const up = { database: { status: "up" as const } };
    const health = {
      check: jest.fn(
        async (indicators: Array<() => Promise<Record<string, unknown>>>) => {
          const results = await Promise.all(indicators.map((run) => run()));
          const merged: Record<string, unknown> = results.reduce(
            (acc, result) => ({ ...acc, ...result }),
            {},
          );
          return { status: "ok", info: merged, error: {}, details: merged };
        },
      ),
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
    const healthIndicatorService = {
      check: (key: string) => ({
        up: (data?: unknown) => ({
          [key]: { status: "up", ...(data as object) },
        }),
        down: (data?: unknown) => ({
          [key]: {
            status: "down",
            ...(typeof data === "string"
              ? { message: data }
              : (data as object)),
          },
        }),
      }),
    };
    const prisma = {};

    return { health, prismaHealth, healthIndicatorService, prisma, up };
  }

  it("returns the Terminus database health result", async () => {
    const { health, prismaHealth, healthIndicatorService, prisma, up } =
      harness();
    const tourApiPolicy = {
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const controller = new HealthController(
      health as never,
      prismaHealth as never,
      healthIndicatorService as never,
      tourApiPolicy as never,
      prisma as never,
    );

    await expect(controller.check()).resolves.toMatchObject({
      status: "ok",
      info: { ...up, tourApiPolicyDb: { status: "up" } },
    });
    expect(prismaHealth.pingCheck).toHaveBeenCalledWith("database", prisma, {
      timeout: 1000,
    });
  });

  it("reports the TourAPI policy database as down when the ping fails", async () => {
    const { health, prismaHealth, healthIndicatorService, prisma } = harness();
    const tourApiPolicy = {
      ping: jest
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error("timeout of 1000ms exceeded")),
    };

    const controller = new HealthController(
      health as never,
      prismaHealth as never,
      healthIndicatorService as never,
      tourApiPolicy as never,
      prisma as never,
    );

    await expect(controller.check()).resolves.toMatchObject({
      info: {
        tourApiPolicyDb: {
          status: "down",
          message: "timeout of 1000ms exceeded",
        },
      },
    });
  });
});
