import type { TourApiDeferredReason } from "./tour-api-policy.js";

export type DetailEnrichmentSummary = {
  status: "SUCCEEDED" | "DEFERRED" | "FAILED";
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  /** All details still pending, including failed attempts. */
  remainingCount: number;
  deferredReason?: TourApiDeferredReason;
};

export class DetailEnrichmentError extends Error {
  #persistenceFailure: unknown;

  constructor(
    readonly summary: DetailEnrichmentSummary,
    cause: unknown,
  ) {
    super("Tourism detail synchronization stopped after a fatal error", {
      cause,
    });
  }

  get persistenceFailure(): unknown {
    return this.#persistenceFailure;
  }

  retainPersistenceFailure(error: unknown): void {
    this.#persistenceFailure ??= error;
  }
}
