import { MODULE_METADATA } from "@nestjs/common/constants.js";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { AppModule } from "../app.module.js";
import { AuthCookieService } from "./auth-cookie.service.js";
import { KAKAO_AUTH_FETCH, OAUTH_STATE_CLOCK } from "./auth.constants.js";
import { AuthController } from "./auth.controller.js";
import { AUTH_CLOCK, AuthService } from "./auth.service.js";
import { KakaoAuthClient } from "./kakao-auth.client.js";
import { AuthModule } from "./auth.module.js";
import { OAuthStateService } from "./oauth-state.service.js";
import { SameOriginGuard } from "./same-origin.guard.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import {
  SESSION_CLEANUP_CLOCK,
  SessionCleanupService,
} from "./session-cleanup.service.js";
import { SESSION_CLOCK, SessionService } from "./session.service.js";

type ValueProvider = {
  provide: symbol;
  useValue: unknown;
};

function providers(): Array<unknown> {
  return Reflect.getMetadata(
    MODULE_METADATA.PROVIDERS,
    AuthModule,
  ) as Array<unknown>;
}

function valueProvider(token: symbol): ValueProvider | undefined {
  return providers().find(
    (provider): provider is ValueProvider =>
      typeof provider === "object" &&
      provider !== null &&
      "provide" in provider &&
      provider.provide === token &&
      "useValue" in provider,
  );
}

describe("AuthModule", () => {
  it("registers the full auth flow and cleanup service without another scheduler bootstrap", () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AuthModule),
    ).toEqual([AuthController]);
    expect(providers()).toEqual(
      expect.arrayContaining([
        AuthService,
        KakaoAuthClient,
        OAuthStateService,
        AuthCookieService,
        SessionService,
        SessionCleanupService,
        SessionAuthGuard,
        SameOriginGuard,
      ]),
    );
    expect(
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, AuthModule) ?? [],
    ).toEqual([]);
  });

  it("provides the real bound fetch and default clocks through explicit tokens", () => {
    expect(valueProvider(KAKAO_AUTH_FETCH)?.useValue).toEqual(
      expect.any(Function),
    );
    expect(valueProvider(AUTH_CLOCK)?.useValue).toBe(Date.now);
    expect(valueProvider(OAUTH_STATE_CLOCK)?.useValue).toBe(Date.now);
    expect(valueProvider(SESSION_CLOCK)?.useValue).toBe(Date.now);
    expect(valueProvider(SESSION_CLEANUP_CLOCK)?.useValue).toBe(Date.now);
  });

  it("exports guards and session services for authenticated personal APIs", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuthModule)).toEqual([
      SessionAuthGuard,
      SameOriginGuard,
      SessionService,
      AuthCookieService,
    ]);
  });

  it("is imported by the application module without replacing existing imports", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule)).toContain(
      AuthModule,
    );
  });

  it("compiles AppModule with unconditional fake Kakao test configuration", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    try {
      const config = moduleRef.get(ConfigService);
      const usesOnlyFakeKakaoValues =
        config.get("KAKAO_REST_API_KEY") === "kakao-rest-test-key" &&
        config.get("KAKAO_CLIENT_SECRET") === "kakao-client-secret-for-test" &&
        config.get("KAKAO_REDIRECT_URI") ===
          "http://localhost:4000/api/v1/auth/kakao/callback";

      expect(usesOnlyFakeKakaoValues).toBe(true);
    } finally {
      await moduleRef.close();
    }
  });
});
