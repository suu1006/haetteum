import { jest } from "@jest/globals";

import { PrismaService } from "./prisma.service.js";

describe("PrismaService", () => {
  it("connects, probes PostgreSQL, and disconnects with the configured database URL", async () => {
    const get = jest
      .fn<(key: "DATABASE_URL", options: { infer: true }) => string>()
      .mockReturnValue("postgresql://haetteum:local@localhost:5432/haetteum");
    const config = { get };

    const service = new PrismaService(config as never);
    const connect = jest
      .spyOn(service, "$connect")
      .mockResolvedValue(undefined);
    const queryRaw = jest
      .spyOn(service, "$queryRaw")
      .mockResolvedValue([{ "?column?": 1 }] as never);
    const disconnect = jest
      .spyOn(service, "$disconnect")
      .mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(get).toHaveBeenCalledWith("DATABASE_URL", { infer: true });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(queryRaw.mock.calls[0]?.[0]).toEqual(["SELECT 1"]);
    expect(connect.mock.invocationCallOrder[0]).toBeLessThan(
      queryRaw.mock.invocationCallOrder[0],
    );
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("disconnects and rethrows when the PostgreSQL readiness probe fails", async () => {
    const get = jest
      .fn<(key: "DATABASE_URL", options: { infer: true }) => string>()
      .mockReturnValue("postgresql://haetteum:local@localhost:5432/haetteum");
    const config = { get };
    const probeError = new Error("database unavailable");
    const service = new PrismaService(config as never);
    const connect = jest
      .spyOn(service, "$connect")
      .mockResolvedValue(undefined);
    const queryRaw = jest
      .spyOn(service, "$queryRaw")
      .mockRejectedValue(probeError);
    const disconnect = jest
      .spyOn(service, "$disconnect")
      .mockResolvedValue(undefined);

    await expect(service.onModuleInit()).rejects.toBe(probeError);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
