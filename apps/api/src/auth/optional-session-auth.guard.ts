import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { SessionAuthGuard } from "./session-auth.guard.js";

/** Only for the anonymous session probe; protected routes keep SessionAuthGuard. */
@Injectable()
export class OptionalSessionAuthGuard implements CanActivate {
  constructor(private readonly sessionGuard: SessionAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await this.sessionGuard.canActivate(context);
    } catch (error) {
      if (error instanceof UnauthorizedException) return true;
      throw error;
    }
  }
}
