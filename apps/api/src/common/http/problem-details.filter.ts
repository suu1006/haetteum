import { randomUUID } from "node:crypto";
import { STATUS_CODES } from "node:http";

import {
  CHAT_ERRORS,
  ChatErrorStatusSchema,
  ProblemDetailsSchema,
  ValidationIssueSchema,
} from "@haetteum/contracts";
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";

import type { RequestWithId } from "./request-id.middleware.js";

const DEFAULT_ERROR_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

const SAFE_ERROR_TYPES = new Set([
  "AggregateError",
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);

function getSafeErrorType(exception: unknown): string {
  if (!(exception instanceof Error)) return "UnknownError";

  const errorType = exception.constructor.name;
  return SAFE_ERROR_TYPES.has(errorType) ? errorType : "UnknownError";
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const extensions =
      typeof exceptionBody === "object" && exceptionBody !== null
        ? (exceptionBody as Record<string, unknown>)
        : {};
    const safeIssues = z
      .array(ValidationIssueSchema)
      .safeParse(extensions.errors);
    const title = STATUS_CODES[status] ?? "Error";
    const requestId = request.requestId ?? randomUUID();

    const chatStatus = ChatErrorStatusSchema.safeParse(status);
    const safeChatDetail =
      status >= 500 &&
      chatStatus.success &&
      extensions.code === CHAT_ERRORS[chatStatus.data].code
        ? CHAT_ERRORS[chatStatus.data].message
        : undefined;
    const problem = ProblemDetailsSchema.parse({
      type: "about:blank",
      title,
      status,
      detail:
        safeChatDetail ??
        (status >= 500
          ? "서버에서 요청을 처리하지 못했습니다."
          : typeof extensions.detail === "string"
            ? extensions.detail
            : title),
      instance: request.originalUrl,
      code:
        typeof extensions.code === "string" &&
        /^[A-Z][A-Z0-9_]*$/.test(extensions.code)
          ? extensions.code
          : (DEFAULT_ERROR_CODES[status] ?? "HTTP_ERROR"),
      requestId,
      errors: safeIssues.success ? safeIssues.data : undefined,
      resetsAt: z.iso.datetime().safeParse(extensions.resetsAt).data,
    });

    if (status >= 500) {
      this.logger.error(
        `requestId=${problem.requestId} status=${status} errorType=${getSafeErrorType(
          exception,
        )}`,
      );
    }

    response.setHeader("X-Request-Id", requestId);
    if (status === 429 && problem.resetsAt) {
      response.setHeader(
        "Retry-After",
        Math.max(
          1,
          Math.ceil((Date.parse(problem.resetsAt) - Date.now()) / 1000),
        ),
      );
    }
    response.status(status).type("application/problem+json").json(problem);
  }
}
