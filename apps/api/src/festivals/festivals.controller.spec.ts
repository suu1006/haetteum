import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import type {
  FestivalDetailResponse,
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

  it("delegates the validated festival id to the detail service", async () => {
    const response: FestivalDetailResponse = {
      id: "21c0f38f-de9f-46ce-9d98-08e6154886d3",
      externalId: "3351268",
      title: "동대문구 맥주축제",
      status: "ONGOING",
      eventStartDate: "2026-08-28",
      eventEndDate: "2026-08-29",
      address: "서울특별시 동대문구 장안동 24-1",
      categoryLabel: "문화예술축제",
      telephone: "02-3291-5506",
      longitude: 127.0753,
      latitude: 37.5666,
      primaryImageUrl: null,
      homepage: null,
      overview: null,
      eventPlace: null,
      eventTime: null,
      feeInfo: null,
      program: null,
      organizer: null,
      organizerTel: null,
      hostAgency: null,
      hostAgencyTel: null,
      images: [],
    };
    const festivals = {
      detail: jest
        .fn<(id: string) => Promise<FestivalDetailResponse>>()
        .mockResolvedValue(response),
    };
    const controller = new FestivalsController(festivals as never);

    await expect(
      controller.detail("21c0f38f-de9f-46ce-9d98-08e6154886d3"),
    ).resolves.toEqual(response);
    expect(festivals.detail).toHaveBeenCalledWith(
      "21c0f38f-de9f-46ce-9d98-08e6154886d3",
    );
  });

  it("rejects a detail result that violates the public response contract", async () => {
    const festivals = {
      detail: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: "not-a-uuid",
      }),
    };
    const controller = new FestivalsController(festivals as never);

    await expect(
      controller.detail("21c0f38f-de9f-46ce-9d98-08e6154886d3"),
    ).rejects.toThrow();
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
