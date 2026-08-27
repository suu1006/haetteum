import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import type {
  FestivalDiscoveryQuery,
  FestivalDiscoveryResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { FestivalsController } from "./festivals.controller.js";

describe("FestivalsController", () => {
  it("delegates the validated discovery query to the service", async () => {
    const response: FestivalDiscoveryResponse = {
      asOfDate: "2026-08-25",
      region: "all",
      ranking: [],
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    };
    const festivals = {
      list: jest
        .fn<
          (query: FestivalDiscoveryQuery) => Promise<FestivalDiscoveryResponse>
        >()
        .mockResolvedValue(response),
    };
    const controller = new FestivalsController(festivals as never);
    const query = { region: "all" as const, page: 1, pageSize: 20 };

    await expect(controller.discovery(query)).resolves.toEqual(response);
    expect(festivals.list).toHaveBeenCalledWith(query);
  });

  it("registers the shared discovery query schema in a validation pipe", () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      FestivalsController,
      "discovery",
    ) as Record<string, { pipes: unknown[] }>;
    const pipe = Object.values(args)[0]?.pipes[0];

    expect(pipe).toBeInstanceOf(ZodValidationPipe);
    expect(
      (pipe as ZodValidationPipe<FestivalDiscoveryQuery>).transform(
        { region: "jeju" },
        { type: "query", metatype: Object, data: undefined },
      ),
    ).toEqual({ region: "jeju", page: 1, pageSize: 20 });
  });

  it("rejects a service result that violates the public response contract", async () => {
    const festivals = {
      list: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        asOfDate: "not-a-date",
        region: "all",
        ranking: [],
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
      }),
    };
    const controller = new FestivalsController(festivals as never);

    await expect(
      controller.discovery({ region: "all", page: 1, pageSize: 20 }),
    ).rejects.toThrow();
  });
});
