import { Module } from "@nestjs/common";

import { AuthCookieService } from "./auth-cookie.service.js";
import {
  EMAIL_SIGNUP_CLOCK,
  KAKAO_AUTH_FETCH,
  OAUTH_STATE_CLOCK,
} from "./auth.constants.js";
import { AuthController } from "./auth.controller.js";
import { AUTH_CLOCK, AuthService } from "./auth.service.js";
import { EmailSignupController } from "./email-signup.controller.js";
import { EmailSignupService } from "./email-signup.service.js";
import { KakaoAuthClient } from "./kakao-auth.client.js";
import { OAuthStateService } from "./oauth-state.service.js";
import { PasswordHasher } from "./password-hasher.service.js";
import { SameOriginGuard } from "./same-origin.guard.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import {
  SESSION_CLEANUP_CLOCK,
  SessionCleanupService,
} from "./session-cleanup.service.js";
import { SESSION_CLOCK, SessionService } from "./session.service.js";
import { VerificationMailService } from "./verification-mail.service.js";

@Module({
  controllers: [AuthController, EmailSignupController],
  providers: [
    AuthService,
    KakaoAuthClient,
    OAuthStateService,
    AuthCookieService,
    SessionService,
    SessionCleanupService,
    SessionAuthGuard,
    SameOriginGuard,
    PasswordHasher,
    VerificationMailService,
    EmailSignupService,
    {
      provide: KAKAO_AUTH_FETCH,
      useValue: globalThis.fetch.bind(globalThis),
    },
    { provide: AUTH_CLOCK, useValue: Date.now },
    { provide: OAUTH_STATE_CLOCK, useValue: Date.now },
    { provide: SESSION_CLOCK, useValue: Date.now },
    { provide: SESSION_CLEANUP_CLOCK, useValue: Date.now },
    { provide: EMAIL_SIGNUP_CLOCK, useValue: Date.now },
  ],
  exports: [
    SessionAuthGuard,
    SameOriginGuard,
    SessionService,
    AuthCookieService,
  ],
})
export class AuthModule {}
