import { HttpException } from "@nestjs/common";
import { CHAT_ERRORS, type ChatErrorStatus } from "@haetteum/contracts";

export function chatHttpError(status: ChatErrorStatus): HttpException {
  return new HttpException(
    { code: CHAT_ERRORS[status].code, detail: CHAT_ERRORS[status].message },
    status,
  );
}

const timeoutNames = new Set([
  "TimeoutError",
  "APIConnectionTimeoutError",
  "TimeoutException",
  "ModelTimeoutException",
]);

/** SDK errors may wrap the actual Bedrock/transport error in cause. */
export function providerErrorStatus(error: unknown): 502 | 504 {
  let current = error;
  for (
    let depth = 0;
    depth < 5 && typeof current === "object" && current !== null;
    depth++
  ) {
    const record = current as Record<string, unknown>;
    if (
      record.status === 504 ||
      (typeof record.name === "string" && timeoutNames.has(record.name)) ||
      record.code === "ETIMEDOUT"
    )
      return 504;
    current = record.cause;
  }
  return 502;
}
