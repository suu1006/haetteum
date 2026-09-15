import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { AuthUser } from "@haetteum/contracts";
import { z } from "zod";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { AccountDeletionService } from "./account-deletion.service.js";
import { AuthCookieService } from "./auth-cookie.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { SameOriginGuard } from "./same-origin.guard.js";
import { SessionAuthGuard } from "./session-auth.guard.js";

@Controller({ path: "auth/account", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class AccountDeletionController {
  constructor(
    private readonly deletion: AccountDeletionService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Delete()
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(z.object({ confirmed: z.literal(true) })))
    _input: { confirmed: true },
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.deletion.remove(user.id);
    this.cookies.clearSession(response);
    this.cookies.clearOAuthState(response);
  }
}
