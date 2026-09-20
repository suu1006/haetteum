/* Async fakes implement the production Promise-based I/O contract. */
/* eslint-disable @typescript-eslint/require-await */
import { TourApiRecovery, TourApiRecoveryError } from "./tour-api-recovery.js";
import {
  MemoryRecoveryRepository,
  recoveryPolicy,
} from "../../test/tour-api-recovery-fixture.js";
import { TourApiBudgetDeferredError } from "./tour-api-policy.js";

const item = {
  job: "tourism" as const,
  contentId: "123",
  sourceVersion: "2026-09-01T00:00:00.000Z",
};
describe("durable recovery execution", () => {
  it("prioritizes untouched versions, waits one then three days, and quarantines the third failure", async () => {
    const repo = new MemoryRecoveryRepository();
    const recovery = new TourApiRecovery(repo as never, recoveryPolicy());
    const fail = () =>
      recovery.item(item, [], async () => {
        throw new Error("mapping failed");
      });
    await expect(fail()).rejects.toThrow();
    const first = await repo.failure(item);
    expect(first?.attemptCount).toBe(1);
    expect(first!.nextAttemptAt!.getTime() - first!.updatedAt.getTime()).toBe(
      86400000,
    );
    expect(
      await recovery.eligible("tourism", [
        { externalId: "123", providerModifiedAt: new Date(item.sourceVersion) },
        { externalId: "456", providerModifiedAt: new Date(item.sourceVersion) },
      ]),
    ).toEqual([
      { externalId: "456", providerModifiedAt: new Date(item.sourceVersion) },
    ]);
    await expect(fail()).rejects.toThrow();
    const second = await repo.failure(item);
    expect(second!.nextAttemptAt!.getTime() - second!.updatedAt.getTime()).toBe(
      259200000,
    );
    await expect(fail()).rejects.toThrow();
    expect((await repo.failure(item))?.state).toBe("QUARANTINED");
  });
  it("does not count budget deferral as an item execution failure", async () => {
    const repo = new MemoryRecoveryRepository();
    const recovery = new TourApiRecovery(repo as never, recoveryPolicy());
    await expect(
      recovery.item(item, [], async () => {
        throw new TourApiBudgetDeferredError("TOUR_API_DAILY_LIMIT");
      }),
    ).rejects.toThrow(TourApiBudgetDeferredError);
    expect(await repo.failure(item)).toBeNull();
  });
  it("requires no HTTP capacity for validated captures and counts only missing operations", async () => {
    const repo = new MemoryRecoveryRepository();
    const requested: number[] = [];
    const policy = recoveryPolicy();
    policy.ensureCapacity = async (n: number) => {
      requested.push(n);
    };
    const recovery = new TourApiRecovery(repo as never, policy);
    await recovery
      .item(item, [], async () => {
        await recovery.capture("detailCommon2", {}, "body", 200, "");
        await recovery.mark("VALIDATED");
        throw new Error("failed destination");
      })
      .catch(() => {});
    await recovery.item(item, ["detailCommon2"], async () => {});
    expect(requested).toEqual([]);
    await recovery.item(
      { ...item, sourceVersion: "2026-09-02T00:00:00.000Z" },
      ["detailCommon2"],
      async () => {},
    );
    expect(requested).toEqual([1]);
  });
  it("fails closed for staging database errors without recording an item failure", async () => {
    const repo = new MemoryRecoveryRepository();
    repo.capture = async () => {
      throw new Error("db unavailable password=secret");
    };
    const recovery = new TourApiRecovery(repo as never, recoveryPolicy());
    await expect(
      recovery.item(item, [], () =>
        recovery.capture("detailCommon2", {}, "{}", 200, ""),
      ),
    ).rejects.toThrow(TourApiRecoveryError);
    expect(await repo.failure(item)).toBeNull();
  });
});

import { TourApiClient } from "./tour-api.client.js";
function stagedClient(repo: MemoryRecoveryRepository, bodies: string[]) {
  let calls = 0;
  const policy = recoveryPolicy();
  const recovery = new TourApiRecovery(repo as never, policy);
  const client = new TourApiClient(
    {
      get: (key: string) =>
        key === "TOUR_API_ENDPOINT" ? "https://example.test" : "secret-key",
    } as never,
    async () => {
      calls++;
      return new Response(bodies.shift() ?? "", { status: 200 });
    },
    async () => {},
    policy,
    recovery,
  );
  return { client, recovery, calls: () => calls };
}
const districtBody = JSON.stringify({
  response: {
    header: { resultCode: "0000", resultMsg: "OK" },
    body: {
      items: {
        item: [
          {
            lDongRegnCd: "11",
            lDongRegnNm: "Seoul",
            lDongSignguCd: "110",
            lDongSignguNm: "District",
          },
        ],
      },
      pageNo: 1,
      numOfRows: 100,
      totalCount: 1,
    },
  },
});
describe("client response staging", () => {
  it("keeps invalid raw evidence before schema validation and redacts the configured key", async () => {
    const repo = new MemoryRecoveryRepository();
    const { client } = stagedClient(repo, ['{"secret":"secret-key"}']);
    await expect(
      client.getDistrictPage({ regionCode: "11", pageNo: 1 }),
    ).rejects.toThrow();
    expect(repo.rows[0]?.body).toBe('{"secret":"[REDACTED]"}');
    expect(repo.rows[0]?.state).toBe("INVALID_SCHEMA");
  });
  it("reparses saved envelopes on local retry and isolates new source versions", async () => {
    const repo = new MemoryRecoveryRepository();
    const { client, recovery, calls } = stagedClient(repo, [
      districtBody,
      districtBody,
    ]);
    const work = () => client.getDistrictPage({ regionCode: "11", pageNo: 1 });
    await expect(
      recovery.item(item, [], async () => {
        await work();
        throw new Error("destination failed");
      }),
    ).rejects.toThrow();
    await recovery.item(item, [], async () => {
      expect((await work()).items[0]?.lDongRegnCd).toBe("11");
    });
    expect(calls()).toBe(1);
    await recovery.item({ ...item, sourceVersion: "new-version" }, [], work);
    expect(calls()).toBe(2);
  });
  it("stores provider failures but fetches fresh response on the next execution", async () => {
    const repo = new MemoryRecoveryRepository();
    const { client, recovery, calls } = stagedClient(repo, [
      JSON.stringify({
        response: { header: { resultCode: "01", resultMsg: "error" } },
      }),
      districtBody,
    ]);
    const work = () => client.getDistrictPage({ regionCode: "11", pageNo: 1 });
    await expect(recovery.item(item, [], work)).rejects.toThrow();
    await recovery.item(item, [], work);
    expect(calls()).toBe(2);
    expect(repo.rows[0]?.state).toBe("REJECTED");
  });
});
describe("pending list pages", () => {
  it("reuses only pending processing in matching list scope and refreshes after completion", async () => {
    const repo = new MemoryRecoveryRepository();
    const { client, recovery, calls } = stagedClient(repo, [
      districtBody,
      districtBody,
    ]);
    const work = () => client.getDistrictPage({ regionCode: "11", pageNo: 1 });
    await expect(
      recovery.list("tourism", "full", async () => {
        await work();
        throw new Error("upsert failed");
      }),
    ).rejects.toThrow();
    const replay = await recovery.list("tourism", "full", async () => {
      const page = await work();
      await recovery.completePage();
      return page;
    });
    expect(replay.replayed).toBe(true);
    expect(calls()).toBe(1);
    const next = await recovery.list("tourism", "full", work);
    expect(next.replayed).toBe(false);
    expect(calls()).toBe(2);
  });
});
describe("partial capture and local replay bounds", () => {
  it("fetches only the missing operation and reports recovery context for the HTTP retry", async () => {
    const repo = new MemoryRecoveryRepository();
    const { client, recovery, calls } = stagedClient(repo, [
      districtBody,
      districtBody,
    ]);
    await expect(
      recovery.item(item, [], async () => {
        await client.getDistrictPage({ regionCode: "11", pageNo: 1 });
        throw new Error("later operation failed");
      }),
    ).rejects.toThrow();
    await recovery.item(item, ["ldongCode2", "detailImage2"], async () => {
      expect(recovery.current()?.isRetry).toBe(true);
      await client.getDistrictPage({ regionCode: "11", pageNo: 1 });
      // A different parameter identity is a missing response even for the same operation.
      await client.getDistrictPage({ regionCode: "26", pageNo: 1 });
    });
    expect(calls()).toBe(2);
  });
  it("blocks missing operations in default local mode before any request", async () => {
    const repo = new MemoryRecoveryRepository();
    const { client, recovery, calls } = stagedClient(repo, [districtBody]);
    await expect(
      recovery.local({ fetchMissing: false, maxRequests: 0 }, () =>
        recovery.item(item, ["ldongCode2"], () =>
          client.getDistrictPage({ regionCode: "11", pageNo: 1 }),
        ),
      ),
    ).rejects.toThrow("TOUR_API_LOCAL_RESPONSE_MISSING");
    expect(calls()).toBe(0);
    expect(await repo.failure(item)).toBeNull();
  });
  it("preserves provider rejection evidence without retrying a storage failure as a network error", async () => {
    const repo = new MemoryRecoveryRepository();
    repo.capture = async () => {
      throw new Error("storage");
    };
    const { client, calls } = stagedClient(repo, [districtBody]);
    await expect(
      client.getDistrictPage({ regionCode: "11", pageNo: 1 }),
    ).rejects.toThrow("TOUR_API_RECOVERY_STORAGE_FAILED");
    expect(calls()).toBe(1);
  });
  it("retains bounded UTF-8 evidence and never replays truncated responses", async () => {
    const repo = new MemoryRecoveryRepository();
    const recovery = new TourApiRecovery(repo as never, recoveryPolicy());
    await expect(
      recovery.item(item, [], async () => {
        await recovery.capture("large", {}, "가".repeat(800000), 200, "");
        throw new Error("bad");
      }),
    ).rejects.toThrow();
    expect(Buffer.byteLength(repo.rows[0].body)).toBeLessThanOrEqual(2097152);
    expect(repo.rows[0]?.truncated).toBe(true);
    await recovery.item(item, [], async () => {
      expect(await recovery.replay("large", {})).toBeNull();
    });
  });
});

import { jest } from "@jest/globals";
describe("recovery scheduling boundaries", () => {
  it("processes never-attempted versions before a due failed version", async () => {
    const repo = new MemoryRecoveryRepository();
    const recovery = new TourApiRecovery(repo as never, recoveryPolicy());
    await expect(
      recovery.item(item, [], async () => {
        throw new Error("failed");
      }),
    ).rejects.toThrow();
    const failure = await repo.failure(item);
    const rows = [
      { externalId: "123", providerModifiedAt: new Date(item.sourceVersion) },
      { externalId: "456", providerModifiedAt: new Date(item.sourceVersion) },
    ];
    expect(
      (
        await recovery.eligible(
          "tourism",
          rows,
          new Date(failure!.nextAttemptAt!.getTime() + 1),
        )
      ).map((row) => row.externalId),
    ).toEqual(["456", "123"]);
  });
  it("does not reuse a pending previous-day list capture", async () => {
    const repo = new MemoryRecoveryRepository();
    const { client, recovery, calls } = stagedClient(repo, [
      districtBody,
      districtBody,
    ]);
    const now = jest
      .spyOn(Date, "now")
      .mockReturnValue(Date.parse("2026-09-20T00:00:00Z"));
    try {
      await expect(
        recovery.list("tourism", "full", async () => {
          await client.getDistrictPage({ regionCode: "11", pageNo: 1 });
          throw new Error("upsert");
        }),
      ).rejects.toThrow();
      now.mockReturnValue(Date.parse("2026-09-21T00:00:00Z"));
      const result = await recovery.list("tourism", "full", () =>
        client.getDistrictPage({ regionCode: "11", pageNo: 1 }),
      );
      expect(result.replayed).toBe(false);
      expect(calls()).toBe(2);
    } finally {
      now.mockRestore();
    }
  });
  it("allows a fixed parser to validate retained raw evidence in HTTP-free local mode", async () => {
    const repo = new MemoryRecoveryRepository();
    const { client, recovery, calls } = stagedClient(repo, [districtBody]);
    await expect(
      recovery.item(item, [], async () => {
        await client.getDistrictPage({ regionCode: "11", pageNo: 1 });
        await recovery.mark("INVALID_SCHEMA");
        throw new Error("old parser");
      }),
    ).rejects.toThrow();
    await recovery.local({ fetchMissing: false, maxRequests: 0 }, () =>
      recovery.item(item, ["ldongCode2"], () =>
        client.getDistrictPage({ regionCode: "11", pageNo: 1 }),
      ),
    );
    expect(calls()).toBe(1);
    expect((await repo.failure(item))?.state).toBe("COMPLETE");
  });
});
describe("capture-before-parse crash recovery", () => {
  it("replays a successful envelope captured before a crash with exhausted capacity", async () => {
    const repo = new MemoryRecoveryRepository();
    const policy = recoveryPolicy();
    const recovery = new TourApiRecovery(repo as never, policy);
    await expect(
      recovery.item(item, [], async () => {
        await recovery.capture(
          "ldongCode2",
          { region: "11" },
          districtBody,
          200,
          "",
        );
        throw new Error("crash before validation");
      }),
    ).rejects.toThrow();
    policy.ensureCapacity = async () => {
      throw new Error("exhausted");
    };
    await expect(
      recovery.item(item, ["ldongCode2"], async () => {
        expect(
          await recovery.replay("ldongCode2", { region: "11" }),
        ).not.toBeNull();
      }),
    ).resolves.toBeUndefined();
  });
});
