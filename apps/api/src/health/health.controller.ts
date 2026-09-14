import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  PrismaHealthIndicator,
} from "@nestjs/terminus";

import { PrismaService } from "../prisma/prisma.service.js";
import { TourApiPolicy } from "../tourism/tour-api-policy.js";

@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly tourApiPolicy: TourApiPolicy,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.prismaHealth.pingCheck("database", this.prisma, {
          timeout: 1000,
        }),
      () => this.checkTourApiPolicy(),
    ]);
  }

  private async checkTourApiPolicy() {
    const check = this.healthIndicatorService.check("tourApiPolicyDb");

    try {
      await this.tourApiPolicy.ping(1000);
    } catch (error) {
      return check.down(
        error instanceof Error ? error.message : "unknown error",
      );
    }

    return check.up();
  }
}
