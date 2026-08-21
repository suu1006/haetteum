import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import type { ApiEnvironment } from "./config/environment.js";
import { configureApp } from "./configure-app.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService<ApiEnvironment, true>);
  const port = config.get("API_PORT", { infer: true });

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
