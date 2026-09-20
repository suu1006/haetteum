import { tourApiHeaderSchema } from "./tour-api.schemas.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { TourApiPolicy, TourApiPolicyError } from "./tour-api-policy.js";
import {
  TourApiRecoveryRepository,
  type ItemIdentity,
} from "./tour-api-recovery.repository.js";

export class TourApiRecoveryError extends TourApiPolicyError {
  constructor() {
    super("TOUR_API_RECOVERY_STORAGE_FAILED");
  }
}
export class TourApiListReplayRefreshError extends TourApiPolicyError {
  constructor() {
    super("TOUR_API_LIST_REPLAY_REQUIRES_REFRESH");
  }
}
export class TourApiRecoverySelectionChangedError extends TourApiPolicyError {
  constructor() {
    super("TOUR_API_RECOVERY_SELECTION_CHANGED");
  }
}
export class TourApiLocalMissingError extends TourApiPolicyError {
  constructor() {
    super("TOUR_API_LOCAL_RESPONSE_MISSING");
  }
}
type RecoveryContext = {
  job: "tourism" | "festival";
  scope: string;
  identity?: ItemIdentity;
  isRetry: boolean;
  captureId?: string;
  replayed: boolean;
  stage?: string;
};
export type ReplayOptions = { fetchMissing: boolean; maxRequests: number };
const BODY_LIMIT = 2 * 1024 * 1024;
@Injectable()
export class TourApiRecovery {
  private readonly context = new AsyncLocalStorage<RecoveryContext>();
  private readonly replayContext = new AsyncLocalStorage<
    ReplayOptions & { requests: number }
  >();
  constructor(
    private readonly repository: TourApiRecoveryRepository,
    private readonly policy: TourApiPolicy,
  ) {}
  current(): Readonly<RecoveryContext> | undefined {
    return this.context.getStore();
  }
  stage(stage: string): void {
    const current = this.context.getStore();
    if (current) current.stage = stage;
  }
  requestScope<T>(work: () => Promise<T>): Promise<T> {
    this.policy.assertBatch();
    if (this.context.getStore()) return work();
    return this.context.run(
      {
        job: this.policy.currentJob(),
        scope: `unscoped:${randomUUID()}`,
        isRetry: false,
        replayed: false,
      },
      work,
    );
  }
  async item<T>(
    identity: ItemIdentity,
    operations: readonly string[],
    work: () => Promise<T>,
  ): Promise<T> {
    this.policy.assertBatch();
    const prior = await this.storage(() => this.repository.failure(identity));
    const state: RecoveryContext = {
      job: identity.job,
      scope: itemScope(identity),
      identity,
      isRetry: prior?.state === "FAILED" || prior?.state === "QUARANTINED",
      replayed: false,
    };
    return this.context.run(state, async () => {
      try {
        const captures = await this.storage(() =>
          this.repository.captures(identity.job, state.scope),
        );
        const existing = new Set(
          captures
            .filter(
              (c) =>
                c.state === "VALIDATED" ||
                successfulEnvelope(c.body, c.httpStatus),
            )
            .map((c) => c.operation),
        );
        const missing = operations.filter(
          (operation) => !existing.has(operation),
        ).length;
        if (missing > 0) {
          const replay = this.replayContext.getStore();
          if (
            replay?.fetchMissing &&
            replay.requests + missing > replay.maxRequests
          )
            throw new TourApiLocalMissingError();
          // Local-only recovery reparses retained validation evidence without reserving HTTP.
          // A genuinely missing operation is rejected by beforeRequest before policy reservation.
          if (!replay || replay.fetchMissing)
            await this.policy.ensureCapacity(missing);
        }
        const result = await work();
        await this.storage(() =>
          this.repository.complete(identity.job, state.scope),
        );
        await this.storage(() => this.repository.resolve(identity));
        return result;
      } catch (error: unknown) {
        if (error instanceof TourApiPolicyError) throw error;
        if (isDatabaseSystemError(error)) throw new TourApiRecoveryError();
        const updatedAt = new Date();
        const attemptCount = (prior?.attemptCount ?? 0) + 1;
        const providerCode =
          error && typeof error === "object" && "providerCode" in error
            ? String(error.providerCode)
            : undefined;
        const dbCode =
          error &&
          typeof error === "object" &&
          "code" in error &&
          /^P2[0-9]{3}$/.test(String(error.code))
            ? String(error.code)
            : undefined;
        const code =
          providerCode &&
          /^(?:\d{2,4}|HTTP_\d{3}|INVALID_RESPONSE|EMPTY_RESPONSE|TIMEOUT|NETWORK_ERROR)$/.test(
            providerCode,
          )
            ? providerCode
            : (dbCode ?? "PROCESSING_FAILED");
        await this.storage(() =>
          this.repository.saveFailure({
            ...identity,
            stage: state.stage ?? (providerCode ? "RESPONSE" : "PROCESSING"),
            code,
            attemptCount,
            nextAttemptAt:
              attemptCount >= 3
                ? null
                : new Date(
                    updatedAt.getTime() +
                      (attemptCount === 1 ? 1 : 3) * 86400000,
                  ),
            state: attemptCount >= 3 ? "QUARANTINED" : "FAILED",
            updatedAt,
          }),
        );
        throw error;
      }
    });
  }
  async eligible<T extends { externalId: string; providerModifiedAt: Date }>(
    job: string,
    rows: T[],
    now = new Date(),
  ): Promise<T[]> {
    const failures = await this.storage(() => this.repository.failures(job));
    const byKey = new Map(
      failures.map((f) => [`${f.contentId}:${f.sourceVersion}`, f]),
    );
    const fresh: T[] = [],
      due: T[] = [];
    for (const row of rows) {
      const failure = byKey.get(
        `${row.externalId}:${row.providerModifiedAt.toISOString()}`,
      );
      if (!failure) fresh.push(row);
      else if (
        failure.state === "FAILED" &&
        failure.nextAttemptAt &&
        failure.nextAttemptAt <= now
      )
        due.push(row);
    }
    return [...fresh, ...due];
  }
  /** Scope includes KST day plus exact run/filter identity. A replayed run cannot advance checkpoint. */
  async list<T>(
    job: "tourism" | "festival",
    runKey: string,
    work: () => Promise<T>,
  ): Promise<{ value: T; replayed: boolean }> {
    this.policy.assertBatch();
    const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const state: RecoveryContext = {
      job,
      scope: `list:${day}:${hash(runKey)}`,
      isRetry: false,
      replayed: false,
    };
    return this.context.run(state, async () => ({
      value: await work(),
      replayed: state.replayed,
    }));
  }
  async completePage(): Promise<void> {
    const state = this.context.getStore();
    if (state?.captureId)
      await this.storage(() =>
        this.repository.mark(state.captureId!, "COMPLETE"),
      );
  }
  async replay(
    operation: string,
    parameters: Record<string, string>,
  ): Promise<{ body: string; httpStatus: number } | null> {
    this.policy.assertBatch();
    const state = this.context.getStore();
    if (!state) return null;
    const found = await this.storage(() =>
      this.repository.find(
        state.job,
        state.scope,
        operation,
        hashParams(parameters),
      ),
    );
    if (!found) return null;
    state.captureId = found.id;
    state.replayed = true;
    return { body: found.body, httpStatus: found.httpStatus };
  }
  /** Called before each actual attempt; Task2 may read current().isRetry for durable retry quota. */
  beforeRequest(): void {
    this.policy.assertBatch();
    const local = this.replayContext.getStore();
    if (local) {
      if (!local.fetchMissing || local.requests >= local.maxRequests)
        throw new TourApiLocalMissingError();
      local.requests++;
    }
  }
  async capture(
    operation: string,
    parameters: Record<string, string>,
    body: string,
    httpStatus: number,
    secret: string,
  ): Promise<void> {
    const state = this.context.getStore();
    const cleaned = redact(body, secret);
    const bytes = Buffer.from(cleaned);
    // Decode only complete UTF-8 sequences; replacement bytes must not exceed database bound.
    const bounded =
      bytes.length > BODY_LIMIT
        ? bytes.subarray(0, BODY_LIMIT - 4).toString("utf8")
        : cleaned;
    const row = await this.storage(() =>
      this.repository.capture({
        job: state?.job ?? this.policy.currentJob(),
        scope: state?.scope ?? `unscoped:${randomUUID()}`,
        contentId: state?.identity?.contentId ?? null,
        sourceVersion: state?.identity?.sourceVersion ?? null,
        operation,
        parameters,
        requestKey: hashParams(parameters),
        body: bounded,
        httpStatus,
        truncated: bytes.length > BODY_LIMIT,
        state: bytes.length > BODY_LIMIT ? "REJECTED" : "CAPTURED",
      }),
    );
    if (state) state.captureId = row.id;
  }
  async mark(state: string): Promise<void> {
    const id = this.context.getStore()?.captureId;
    if (id) await this.storage(() => this.repository.mark(id, state));
  }
  local<T>(options: ReplayOptions, work: () => Promise<T>): Promise<T> {
    return this.replayContext.run({ ...options, requests: 0 }, work);
  }

  /** The caller has read the matching committed destination version. No HTTP or remapping is needed. */
  async reconcile(identity: ItemIdentity): Promise<void> {
    this.policy.assertBatch();
    await this.storage(() =>
      this.repository.complete(identity.job, itemScope(identity)),
    );
    await this.storage(() => this.repository.resolve(identity));
  }
  async assertSelected(identity: ItemIdentity): Promise<void> {
    this.policy.assertBatch();
    const failure = await this.storage(() => this.repository.failure(identity));
    if (failure?.state !== "FAILED")
      throw new TourApiRecoverySelectionChangedError();
  }
  async reconcileCommitted(
    job: ItemIdentity["job"],
    ids: readonly string[] = [],
    limit = 100,
  ): Promise<void> {
    this.policy.assertBatch();
    const committed = await this.storage(() =>
      this.repository.selectCurrent(job, ids, limit, true),
    );
    for (const identity of committed) await this.reconcile(identity);
  }
  async failedItems(
    job: ItemIdentity["job"],
    ids: readonly string[],
    limit: number,
    requeue = false,
  ): Promise<ItemIdentity[]> {
    this.policy.assertBatch();
    // Separately bounded reconciliation does not consume execution slots.
    await this.reconcileCommitted(job, ids, limit);
    const selected = await this.storage(() =>
      this.repository.selectCurrent(job, ids, limit, false, requeue),
    );
    if (requeue) await this.storage(() => this.repository.requeue(selected));
    return selected;
  }
  private async storage<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch {
      throw new TourApiRecoveryError();
    }
  }
}
function itemScope(i: ItemIdentity): string {
  return `item:${i.contentId}:${i.sourceVersion}`;
}
function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function hashParams(parameters: Record<string, string>): string {
  return hash(
    JSON.stringify(
      Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}
function redact(value: string, secret: string): string {
  const secrets = new Set([secret, encodeURIComponent(secret)]);
  try {
    secrets.add(decodeURIComponent(secret));
  } catch {
    /* already plain */
  }
  for (const key of secrets)
    if (key) value = value.split(key).join("[REDACTED]");
  return value;
}
export function isDatabaseSystemError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const name = "name" in error ? String(error.name) : "";
  return (
    /^(P100[0-9]|P101[0-7]|P2024|P2037|08\w{3}|53\w{3}|57P0[123]|ECONNRESET|ECONNREFUSED|ETIMEDOUT)$/.test(
      code,
    ) ||
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientRustPanicError"
  );
}

function successfulEnvelope(body: string, status: number): boolean {
  if (status < 200 || status >= 300) return false;
  try {
    const parsed = tourApiHeaderSchema.safeParse(JSON.parse(body) as unknown);
    return parsed.success && parsed.data.response.header.resultCode === "0000";
  } catch {
    return false;
  }
}
