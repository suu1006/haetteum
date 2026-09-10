import {
  AuthUserSchema,
  EmailSignupStartRequestSchema,
  EmailSignupVerifyRequestSchema,
  type EmailSignupStartRequest,
  type EmailSignupStartResponse,
  type EmailSignupVerifyRequest,
  type EmailSignupVerifyResponse,
} from "@haetteum/contracts";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { AuthCookieService } from "./auth-cookie.service.js";
import { EmailSignupService } from "./email-signup.service.js";
import { SameOriginGuard } from "./same-origin.guard.js";

@Controller({ path: "auth/signup", version: "1" })
@UseGuards(SameOriginGuard)
export class EmailSignupController {
  constructor(
    private readonly emailSignup: EmailSignupService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post("start")
  @HttpCode(HttpStatus.OK)
  async start(
    @Body(new ZodValidationPipe(EmailSignupStartRequestSchema))
    input: EmailSignupStartRequest,
  ): Promise<EmailSignupStartResponse> {
    const result = await this.emailSignup.start(input.email, input.password);
    return { codeExpiresAt: result.codeExpiresAt.toISOString() };
  }

  @Post("verify-code")
  @HttpCode(HttpStatus.OK)
  async verifyCode(
    @Body(new ZodValidationPipe(EmailSignupVerifyRequestSchema))
    input: EmailSignupVerifyRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EmailSignupVerifyResponse> {
    const result = await this.emailSignup.verifyCode(input.email, input.code);
    this.cookies.setSession(response, result.sessionToken, result.expiresAt);

    return { verified: true, user: AuthUserSchema.parse(result.user) };
  }
}
