import { EventEmitter } from "node:events";

import {
  Logger,
  type CallHandler,
  type ExecutionContext,
} from "@nestjs/common";
import { jest } from "@jest/globals";
import { of, type Observable } from "rxjs";

import { LoggingInterceptor } from "./logging.interceptor.js";
import type { RequestWithId } from "./request-id.middleware.js";

type FakeResponse = EventEmitter & { statusCode: number };

function fakeContext(
  request: RequestWithId,
  response: FakeResponse,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as never;
}

function fakeHandler<T>(value: T): CallHandler<T> {
  return { handle: (): Observable<T> => of(value) };
}

describe("LoggingInterceptor", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs the request line at 'log' level once the response finishes successfully", () => {
    const logSpy = jest
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => undefined);
    const request = {
      requestId: "req-1",
      method: "GET",
      originalUrl: "/api/v1/health",
    } as RequestWithId;
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
    });

    new LoggingInterceptor().intercept(
      fakeContext(request, response),
      fakeHandler("ok"),
    );
    response.emit("finish");

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^requestId=req-1 method=GET path=\/api\/v1\/health status=200 durationMs=\d+(\.\d)?$/,
      ),
    );
  });

  it("logs at 'warn' level for a 4xx response", () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const request = {
      method: "GET",
      originalUrl: "/api/v1/missing",
    } as RequestWithId;
    const response = Object.assign(new EventEmitter(), {
      statusCode: 404,
    });

    new LoggingInterceptor().intercept(
      fakeContext(request, response),
      fakeHandler(undefined),
    );
    response.emit("finish");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "requestId=- method=GET path=/api/v1/missing status=404",
      ),
    );
  });

  it("logs at 'error' level for a 5xx response", () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const request = {
      method: "POST",
      originalUrl: "/api/v1/chat",
    } as RequestWithId;
    const response = Object.assign(new EventEmitter(), {
      statusCode: 500,
    });

    new LoggingInterceptor().intercept(
      fakeContext(request, response),
      fakeHandler(undefined),
    );
    response.emit("finish");

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("status=500"),
    );
  });

  it("passes the handler's stream through unchanged", () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const request = { method: "GET", originalUrl: "/x" } as RequestWithId;
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
    });

    const result = new LoggingInterceptor().intercept(
      fakeContext(request, response),
      fakeHandler("payload"),
    );
    let received: unknown;
    result.subscribe((value) => {
      received = value;
    });

    expect(received).toBe("payload");
  });
  it.each([302, 400, 500])(
    "omits all query values from logs for status %i",
    (statusCode) => {
      const messages: string[] = [];
      for (const level of ["log", "warn", "error"] as const) {
        jest
          .spyOn(Logger.prototype, level)
          .mockImplementation((value: unknown) => {
            messages.push(String(value));
          });
      }
      const response = Object.assign(new EventEmitter(), { statusCode });
      new LoggingInterceptor().intercept(
        fakeContext(
          {
            method: "GET",
            originalUrl:
              "/api/v1/auth/kakao/callback?code=private-code&state=private-state",
          } as RequestWithId,
          response,
        ),
        fakeHandler(undefined),
      );
      response.emit("finish");
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("path=/api/v1/auth/kakao/callback status=");
      expect(messages[0]).not.toContain("private-");
      expect(messages[0]).not.toContain("?");
    },
  );
});
