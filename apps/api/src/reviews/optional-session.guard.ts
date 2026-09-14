import {
  Injectable,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { AuthCookieService } from "../auth/auth-cookie.service.js";
import { SessionService } from "../auth/session.service.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";

@Injectable()
export class OptionalSessionGuard extends SessionAuthGuard {
  constructor(sessions: SessionService, cookies: AuthCookieService) {
    super(sessions, cookies);
  }
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof UnauthorizedException) return true;
      throw error;
    }
  }
}
