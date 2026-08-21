import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";
import type { ApiEnvironment } from "../config/environment.js";

const DATABASE_READINESS_TIMEOUT_MS = 5_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<ApiEnvironment, true>) {
    const connectionString = config.get("DATABASE_URL", { infer: true });
    super({
      adapter: new PrismaPg({
        connectionString,
        connectionTimeoutMillis: DATABASE_READINESS_TIMEOUT_MS,
        query_timeout: DATABASE_READINESS_TIMEOUT_MS,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    try {
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      await this.$disconnect().catch(() => undefined);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
