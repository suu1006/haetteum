import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Response } from "express";
import type { Observable } from "rxjs";

import type { RequestWithId } from "./request-id.middleware.js";
import { requestPath } from "./request-path.js";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    // response의 status는 컨트롤러/예외 필터가 다 처리한 뒤에야 최종 확정되므로,
    // 스트림 콜백이 아니라 finish 이벤트에서 로그를 남긴다.
    response.once("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const line = `requestId=${request.requestId ?? "-"} method=${request.method} path=${requestPath(request.originalUrl)} status=${response.statusCode} durationMs=${durationMs.toFixed(1)}`;

      if (response.statusCode >= 500) this.logger.error(line);
      else if (response.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    return next.handle();
  }
}
