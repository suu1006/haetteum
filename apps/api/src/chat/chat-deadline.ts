import { CHAT_RESPONSE_TIMEOUT_MS } from "./chat.constants.js";

/** One deadline covers the entire answer, including all streamed chunks. */
export class ChatDeadline {
  private readonly controller = new AbortController();
  private readonly timer = setTimeout(() => {
    this.controller.abort(
      new DOMException("Chat deadline exceeded", "TimeoutError"),
    );
  }, CHAT_RESPONSE_TIMEOUT_MS);
  readonly signal: AbortSignal;

  constructor(parent?: AbortSignal) {
    this.signal = parent
      ? AbortSignal.any([parent, this.controller.signal])
      : this.controller.signal;
    this.timer.unref();
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        const reason: unknown = this.signal.reason;
        reject(
          reason instanceof Error
            ? reason
            : new Error("Chat aborted", { cause: reason }),
        );
      };
      const cleanup = () => this.signal.removeEventListener("abort", onAbort);
      if (this.signal.aborted) {
        onAbort();
        return;
      }
      this.signal.addEventListener("abort", onAbort, { once: true });
      Promise.resolve()
        .then(() => {
          this.signal.throwIfAborted();
          return operation();
        })
        .then(
          (result) => {
            cleanup();
            resolve(result);
          },
          (error: unknown) => {
            cleanup();
            reject(
              error instanceof Error
                ? error
                : new Error("Chat operation failed", { cause: error }),
            );
          },
        );
    });
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.controller.abort();
  }
}
