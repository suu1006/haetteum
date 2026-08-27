import {
  CanActivate,
  ForbiddenException,
  Injectable,
  type ExecutionContext,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

import type { ApiEnvironment } from "../config/environment.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class SameOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<ApiEnvironment, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = request.headers.origin;
    const trustedOrigin = this.config.get("WEB_ORIGIN", { infer: true });
    if (typeof origin === "string" && origin === trustedOrigin) return true;

    throw new ForbiddenException({
      code: "FORBIDDEN_ORIGIN",
      detail: "허용되지 않은 요청 출처입니다.",
    });
  }
}
