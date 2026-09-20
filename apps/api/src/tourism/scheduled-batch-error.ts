/** Safe at the Nest cron catch/log boundary; original cause is deliberately not an Error.cause. */
export class ScheduledBatchError extends Error {
  readonly #originalError: unknown;

  constructor(
    job: "tourism" | "festival",
    stage: "list" | "details",
    originalError: unknown,
  ) {
    super(
      `TourAPI ${job} scheduled batch failed (${stage === "details" ? "DETAILS_FAILED" : "LIST_FAILED"})`,
    );
    this.#originalError = originalError;
  }

  /** Explicit internal diagnostics only; not serialized or inspected by the cron logger. */
  get originalError(): unknown {
    return this.#originalError;
  }
}
