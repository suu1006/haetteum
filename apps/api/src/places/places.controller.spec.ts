import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import type { ListPlacesQuery, PlacesPage } from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlacesController } from "./places.controller.js";

describe("PlacesController", () => {
  it("passes the validated query to the service and returns its direct page response", async () => {
    const page: PlacesPage = {
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    };
    const places = {
      list: jest
        .fn<(query: ListPlacesQuery) => Promise<PlacesPage>>()
        .mockResolvedValue(page),
    };
    const controller = new PlacesController(places as never);
    const query = { region: "jeju" as const, page: 1, pageSize: 20, q: "" };

    await expect(controller.list(query)).resolves.toBe(page);
    expect(places.list).toHaveBeenCalledWith(query);
  });

  it("registers the shared places query schema in a query validation pipe", () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      PlacesController,
      "list",
    ) as Record<string, { pipes: unknown[] }>;
    const parameter = Object.values(args)[0];
    const pipe = parameter?.pipes[0];

    expect(pipe).toBeInstanceOf(ZodValidationPipe);
    expect(
      (
        pipe as ZodValidationPipe<{
          region: "jeju";
          page: number;
          pageSize: number;
          q: string;
        }>
      ).transform(
        { region: "jeju", q: "  성산  " },
        { type: "query", metatype: Object, data: undefined },
      ),
    ).toEqual({ region: "jeju", page: 1, pageSize: 20, q: "성산" });
  });
});
