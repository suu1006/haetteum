import { ConfigService } from "@nestjs/config";
import { VersioningType, type INestApplication } from "@nestjs/common";

import { ProblemDetailsFilter } from "./common/http/problem-details.filter.js";
import { RequestIdMiddleware } from "./common/http/request-id.middleware.js";
import type { ApiEnvironment } from "./config/environment.js";

export function configureApp(app: INestApplication): void {
  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  const config = app.get(ConfigService<ApiEnvironment, true>);

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  app.enableCors({
    origin: [config.get("WEB_ORIGIN", { infer: true })],
    credentials: true,
  });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
}
