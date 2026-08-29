import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import type {
  GeneratedCourseResponse,
  ListPlacesQuery,
  NearbyPlacesResponse,
  PlaceDetailResponse,
  PlacesPage,
} from "@haetteum/contracts";

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
    const controller = new PlacesController(places as never, {} as never);
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

  it("passes one place ID to detail and nearby service methods", async () => {
    const detail = {
      id: "24684077-a907-45c3-85bf-b509dab12377",
    } as PlaceDetailResponse;
    const nearby: NearbyPlacesResponse = {
      status: "unavailable",
      reason: "provider_not_configured",
    };
    const places = {
      detail: jest
        .fn<() => Promise<PlaceDetailResponse>>()
        .mockResolvedValue(detail),
      nearby: jest
        .fn<() => Promise<NearbyPlacesResponse>>()
        .mockResolvedValue(nearby),
    };
    const controller = new PlacesController(places as never, {} as never);
    const id = "24684077-a907-45c3-85bf-b509dab12377";

    await expect(controller.detail(id)).resolves.toBe(detail);
    await expect(
      controller.nearby(id, { category: "attraction", limit: 10 }),
    ).resolves.toBe(nearby);
  });

  it("passes one place ID to the course builder and returns its direct response", async () => {
    const course: GeneratedCourseResponse = {
      status: "unavailable",
      reason: "coordinates_missing",
    };
    const courseBuilder = {
      buildForPlace: jest
        .fn<() => Promise<GeneratedCourseResponse>>()
        .mockResolvedValue(course),
    };
    const controller = new PlacesController(
      {} as never,
      courseBuilder as never,
    );
    const id = "24684077-a907-45c3-85bf-b509dab12377";

    await expect(controller.course(id)).resolves.toBe(course);
    expect(courseBuilder.buildForPlace).toHaveBeenCalledWith(id);
  });
});
