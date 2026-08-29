import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import { RequestMethod } from "@nestjs/common";
import { jest } from "@jest/globals";

import {
  ListHotPlaceRankingsQuerySchema,
  type ListHotPlaceRankingsQuery,
  type HotPlaceRankingResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { HotPlaceRankingsController } from "./hot-place-rankings.controller.js";

describe("HotPlaceRankingsController", () => {
  it("delegates the validated query to the service and returns the public response", async () => {
    const response: HotPlaceRankingResponse = {
      source: "KTO_DATALAB",
      scope: "national",
      baseYearMonth: "202607",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      audience: "all",
      items: [],
    };
    const rankings = {
      list: jest
        .fn<
          (query: ListHotPlaceRankingsQuery) => Promise<HotPlaceRankingResponse>
        >()
        .mockResolvedValue(response),
    };
    const controller = new HotPlaceRankingsController(rankings as never);
    const query = { audience: "all" as const, limit: 10 };

    await expect(controller.list(query)).resolves.toEqual(response);
    expect(rankings.list).toHaveBeenCalledWith(query);
  });

  it("registers the versioned hot place rankings collection GET route", () => {
    const listHandler = Object.getOwnPropertyDescriptor(
      HotPlaceRankingsController.prototype,
      "list",
    )?.value as (...args: unknown[]) => unknown;

    expect(Reflect.getMetadata(PATH_METADATA, HotPlaceRankingsController)).toBe(
      "hot-place-rankings",
    );
    expect(
      Reflect.getMetadata(VERSION_METADATA, HotPlaceRankingsController),
    ).toBe("1");
    expect(Reflect.getMetadata(PATH_METADATA, listHandler)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, listHandler)).toBe(
      RequestMethod.GET,
    );
  });

  it("registers the shared rankings query schema in a validation pipe", () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      HotPlaceRankingsController,
      "list",
    ) as Record<string, { pipes: unknown[] }>;
    const pipe = Object.values(args)[0]?.pipes[0];

    expect(pipe).toBeInstanceOf(ZodValidationPipe);
    expect(
      (pipe as ZodValidationPipe<ListHotPlaceRankingsQuery>).transform(
        { audience: "60s-plus", limit: "3" },
        { type: "query", metatype: Object, data: undefined },
      ),
    ).toEqual({ audience: "60s-plus", limit: 3 });
    expect(
      (pipe as ZodValidationPipe<ListHotPlaceRankingsQuery>).transform(
        {},
        { type: "query", metatype: Object, data: undefined },
      ),
    ).toEqual(ListHotPlaceRankingsQuerySchema.parse({}));
  });

  it("rejects a service result that violates the public response contract", async () => {
    const rankings = {
      list: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        source: "KTO_DATALAB",
        scope: "national",
        baseYearMonth: "202607",
        periodStart: "not-a-date",
        periodEnd: "2026-07-31",
        audience: "all",
        items: [],
      }),
    };
    const controller = new HotPlaceRankingsController(rankings as never);

    await expect(
      controller.list({ audience: "all", limit: 10 }),
    ).rejects.toThrow();
  });
});
