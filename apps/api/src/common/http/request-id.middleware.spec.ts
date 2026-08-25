import { jest } from "@jest/globals";

import { RequestIdMiddleware } from "./request-id.middleware.js";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("RequestIdMiddleware", () => {
  it("owns one UUID across the request and response", () => {
    const request = { requestId: "client-provided-request-id" } as never;
    let responseHeader: [string, string] | undefined;
    const response = {
      setHeader(name: string, value: string): void {
        responseHeader = [name, value];
      },
    } as never;
    const next = jest.fn<() => void>();

    new RequestIdMiddleware().use(request, response, next as never);

    const requestId = (request as { requestId: string }).requestId;
    expect(requestId).toMatch(UUID_V4);
    expect(requestId).not.toBe("client-provided-request-id");
    expect(responseHeader).toEqual(["X-Request-Id", requestId]);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
