/* Async fakes implement the production Promise-based I/O contract. */
/* eslint-disable @typescript-eslint/require-await */
import { randomUUID } from "node:crypto";
import type {
  TourApiCapture,
  TourApiItemRecovery,
} from "../src/generated/prisma/client.js";
import type {
  CaptureInput,
  ItemIdentity,
} from "../src/tourism/tour-api-recovery.repository.js";
import {
  TourApiPolicyError,
  TourApiBudgetDeferredError,
  type TourApiPolicy,
} from "../src/tourism/tour-api-policy.js";
export class MemoryRecoveryRepository {
  async selectCurrent(): Promise<ItemIdentity[]> {
    return [];
  }
  rows: TourApiCapture[] = [];
  failuresByKey = new Map<string, TourApiItemRecovery>();
  async capture(input: CaptureInput) {
    const row = {
      ...input,
      id: randomUUID(),
      capturedAt: new Date(),
      completedAt: null,
    };
    this.rows.push(row);
    return row;
  }
  async find(
    job: string,
    scope: string,
    operation: string,
    requestKey: string,
  ) {
    return (
      [...this.rows]
        .reverse()
        .find(
          (r) =>
            r.job === job &&
            r.scope === scope &&
            r.operation === operation &&
            r.requestKey === requestKey &&
            !r.truncated &&
            ["CAPTURED", "VALIDATED", "INVALID_SCHEMA"].includes(r.state),
        ) ?? null
    );
  }
  async captures(job: string, scope: string) {
    return this.rows.filter(
      (r) =>
        r.job === job &&
        r.scope === scope &&
        ["CAPTURED", "VALIDATED", "INVALID_SCHEMA"].includes(r.state) &&
        !r.truncated,
    );
  }
  async mark(id: string, state: string) {
    this.rows.find((r) => r.id === id)!.state = state;
  }
  async complete(job: string, scope: string) {
    for (const r of this.rows)
      if (r.job === job && r.scope === scope && r.state === "VALIDATED")
        r.state = "COMPLETE";
  }
  async failure(i: ItemIdentity) {
    return (
      this.failuresByKey.get([i.job, i.contentId, i.sourceVersion].join(":")) ??
      null
    );
  }
  async failures(job: string) {
    return [...this.failuresByKey.values()].filter(
      (f) => f.job === job && f.state !== "COMPLETE",
    );
  }
  async saveFailure(i: TourApiItemRecovery) {
    this.failuresByKey.set([i.job, i.contentId, i.sourceVersion].join(":"), i);
  }
  async resolve(i: ItemIdentity) {
    const row = await this.failure(i);
    if (row) row.state = "COMPLETE";
  }
  async requeue() {}
}
export function recoveryPolicy(): TourApiPolicy {
  return {
    assertBatch: () => {},
    remainingMs: () => 2_400_000,
    deadlineExceeded: () => {
      throw new TourApiBudgetDeferredError("TOUR_API_BATCH_DEADLINE");
    },
    stopProvider: async (reason: string) => {
      throw reason === "AUTH"
        ? new TourApiPolicyError("TOUR_API_PROVIDER_AUTH")
        : new TourApiBudgetDeferredError("TOUR_API_PROVIDER_COOLDOWN");
    },
    currentJob: () => "tourism",
    ensureCapacity: async () => {},
    request: async <T>(work: () => Promise<T>) => work(),
  } as unknown as TourApiPolicy;
}
import { TourApiRecovery } from "../src/tourism/tour-api-recovery.js";
export function testRecovery(policy: Partial<TourApiPolicy> = {}) {
  return new TourApiRecovery(
    new MemoryRecoveryRepository() as never,
    { ...recoveryPolicy(), ...policy } as TourApiPolicy,
  );
}
