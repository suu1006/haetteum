import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ProblemDetails } from "@haetteum/contracts";
import { jest } from "@jest/globals";

import { ProblemDetailsFilter } from "./problem-details.filter.js";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EXISTING_REQUEST_ID = "f2e09553-1b48-40de-8d6e-a3d68a0d9636";

function createHost(options: { requestId?: string | undefined } = {}) {
  let statusCode: number | undefined;
  let contentType: string | undefined;
  let body: unknown;
  const headers = new Map<string, string>();
  const requestId =
    "requestId" in options ? options.requestId : EXISTING_REQUEST_ID;
  const response = {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
      return response;
    },
    status(status: number) {
      statusCode = status;
      return response;
    },
    type(type: string) {
      contentType = type;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
  };
  const request = {
    requestId,
    originalUrl: "/api/v1/missing",
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as never;

  return {
    host,
    header: (name: string) => headers.get(name.toLowerCase()),
    result: () => ({ body, contentType, statusCode }),
  };
}

describe("ProblemDetailsFilter", () => {
  it("serializes validation extensions as a 400 problem", () => {
    const { host, result } = createHost();

    new ProblemDetailsFilter().catch(
      new BadRequestException({
        code: "VALIDATION_ERROR",
        detail: "요청값이 올바르지 않습니다.",
        errors: [{ path: "body.name", message: "Required" }],
      }),
      host,
    );

    expect(result()).toEqual({
      statusCode: 400,
      contentType: "application/problem+json",
      body: {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "요청값이 올바르지 않습니다.",
        instance: "/api/v1/missing",
        code: "VALIDATION_ERROR",
        requestId: "f2e09553-1b48-40de-8d6e-a3d68a0d9636",
        errors: [{ path: "body.name", message: "Required" }],
      },
    });
  });

  it("uses the request URL and NOT_FOUND code for missing resources", () => {
    const { host, result } = createHost();

    new ProblemDetailsFilter().catch(new NotFoundException(), host);

    const response = result();
    const body = response.body as ProblemDetails;

    expect(response.statusCode).toBe(404);
    expect(body.instance).toBe("/api/v1/missing");
    expect(body.code).toBe("NOT_FOUND");
  });

  it("uses one generated request ID in the fallback response header and body", () => {
    const { header, host, result } = createHost({ requestId: undefined });

    new ProblemDetailsFilter().catch(new BadRequestException(), host);

    const body = result().body as ProblemDetails;
    expect(body.requestId).toMatch(UUID_V4);
    expect(body.requestId).not.toBe(EXISTING_REQUEST_ID);
    expect(header("X-Request-Id")).toBe(body.requestId);
  });

  it("does not expose raw unexpected-error details", () => {
    const { host, result } = createHost();
    const filter = new ProblemDetailsFilter();
    const logger = (
      filter as unknown as { logger: { error: (message: string) => void } }
    ).logger;
    jest.spyOn(logger, "error").mockImplementation(() => {});

    filter.catch(new Error("DATABASE_URL=secret"), host);

    const response = result();
    const body = response.body as ProblemDetails;

    expect(response.statusCode).toBe(500);
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.detail).toBe("서버에서 요청을 처리하지 못했습니다.");
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL=secret");
  });

  it("logs sanitized 5xx metadata without raw error details", () => {
    const { host } = createHost();
    const filter = new ProblemDetailsFilter();
    const logger = (
      filter as unknown as { logger: { error: (message: string) => void } }
    ).logger;
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});

    filter.catch(new Error("DATABASE_URL=secret"), host);

    expect(errorSpy).toHaveBeenCalledWith(
      "requestId=f2e09553-1b48-40de-8d6e-a3d68a0d9636 status=500 errorType=Error",
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "DATABASE_URL=secret",
    );
  });
});
