import { RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";
import type { Response } from "express";

import type { AuthCookieService } from "./auth-cookie.service.js";
import { EmailSignupController } from "./email-signup.controller.js";
import type {
  EmailSignupService,
  EmailSignupStarted,
  EmailSignupVerified,
} from "./email-signup.service.js";
import { SameOriginGuard } from "./same-origin.guard.js";

const codeExpiresAt = new Date("2026-09-09T12:03:00.000Z");
const sessionExpiresAt = new Date("2026-09-23T12:00:00.000Z");
const user = {
  id: "10000000-0000-4000-8000-000000000003",
  displayName: "traveler",
  profileImageUrl: null,
  provider: "EMAIL",
} as const;

function handler(
  method: keyof EmailSignupController,
): (...args: never[]) => unknown {
  return Object.getOwnPropertyDescriptor(
    EmailSignupController.prototype,
    method,
  )?.value as (...args: never[]) => unknown;
}

function createController(options?: {
  startError?: Error;
  verifyError?: Error;
}) {
  const start = options?.startError
    ? jest
        .fn<() => Promise<EmailSignupStarted>>()
        .mockRejectedValue(options.startError)
    : jest
        .fn<() => Promise<EmailSignupStarted>>()
        .mockResolvedValue({ codeExpiresAt });
  const verifyCode = options?.verifyError
    ? jest
        .fn<() => Promise<EmailSignupVerified>>()
        .mockRejectedValue(options.verifyError)
    : jest.fn<() => Promise<EmailSignupVerified>>().mockResolvedValue({
        user,
        sessionToken: "A".repeat(43),
        expiresAt: sessionExpiresAt,
      });
  const emailSignup = { start, verifyCode } as unknown as EmailSignupService;
  const setSession = jest.fn();
  const cookies = { setSession } as unknown as AuthCookieService;
  const response = {} as unknown as Response;

  return {
    controller: new EmailSignupController(emailSignup, cookies),
    start,
    verifyCode,
    setSession,
    response,
  };
}

describe("EmailSignupController", () => {
  it("starts a signup and returns the code expiry as an ISO string", async () => {
    const { controller, start } = createController();

    await expect(
      controller.start({
        email: "traveler@haetteum.kr",
        password: "Password1!",
      }),
    ).resolves.toEqual({ codeExpiresAt: codeExpiresAt.toISOString() });
    expect(start).toHaveBeenCalledWith("traveler@haetteum.kr", "Password1!");
  });

  it("propagates a failure from starting the signup", async () => {
    const { controller } = createController({
      startError: new Error("EMAIL_ALREADY_REGISTERED"),
    });

    await expect(
      controller.start({
        email: "traveler@haetteum.kr",
        password: "Password1!",
      }),
    ).rejects.toThrow("EMAIL_ALREADY_REGISTERED");
  });

  it("verifies a code, issues the session cookie, and returns the public user", async () => {
    const { controller, verifyCode, setSession, response } = createController();

    await expect(
      controller.verifyCode(
        { email: "traveler@haetteum.kr", code: "123456" },
        response,
      ),
    ).resolves.toEqual({ verified: true, user });
    expect(verifyCode).toHaveBeenCalledWith("traveler@haetteum.kr", "123456");
    expect(setSession).toHaveBeenCalledWith(
      response,
      "A".repeat(43),
      sessionExpiresAt,
    );
  });

  it("propagates a failure from verifying the code without setting a session", async () => {
    const { controller, setSession, response } = createController({
      verifyError: new Error("VERIFICATION_CODE_MISMATCH"),
    });

    await expect(
      controller.verifyCode(
        { email: "traveler@haetteum.kr", code: "000000" },
        response,
      ),
    ).rejects.toThrow("VERIFICATION_CODE_MISMATCH");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("registers exact versioned routes and guards", () => {
    expect(Reflect.getMetadata(PATH_METADATA, EmailSignupController)).toBe(
      "auth/signup",
    );
    expect(Reflect.getMetadata(VERSION_METADATA, EmailSignupController)).toBe(
      "1",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, EmailSignupController)).toEqual(
      [SameOriginGuard],
    );

    expect(Reflect.getMetadata(PATH_METADATA, handler("start"))).toBe("start");
    expect(Reflect.getMetadata(METHOD_METADATA, handler("start"))).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("start"))).toBe(200);

    expect(Reflect.getMetadata(PATH_METADATA, handler("verifyCode"))).toBe(
      "verify-code",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("verifyCode"))).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("verifyCode"))).toBe(
      200,
    );
  });
});
