import { jest } from "@jest/globals";
import { ChatQuotaService } from "./chat-quota.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

function setup(result: { used: number }[] = [{ used: 1 }]) {
  const query = jest
    .fn<() => Promise<{ used: number }[]>>()
    .mockResolvedValue(result);
  const service = new ChatQuotaService(
    { $queryRaw: query } as unknown as PrismaService,
    () => Date.parse("2026-09-11T14:59:59.000Z"),
  );
  return { service, query };
}

it("returns the remaining user allowance and next Korean midnight", async () => {
  const { service } = setup();
  expect(await service.consume({ userId: "user-1" })).toEqual({
    remaining: 9,
    resetsAt: "2026-09-11T15:00:00.000Z",
  });
});

it("returns a quota error when the database refuses the atomic increment", async () => {
  const { service } = setup([]);
  await expect(service.consume({ userId: "user-1" })).rejects.toMatchObject({
    status: 429,
    response: {
      code: "CHAT_DAILY_LIMIT",
      resetsAt: "2026-09-11T15:00:00.000Z",
    },
  });
});

it("fails closed if the counter store is unavailable", async () => {
  const { service, query } = setup();
  query.mockRejectedValue(new Error("database offline"));
  await expect(service.consume({ userId: "user-1" })).rejects.toThrow(
    "database offline",
  );
});
