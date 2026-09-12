import { RequestMethod, type ExecutionContext } from "@nestjs/common";
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import {
  FavoritePlaceItemSchema,
  FavoritePlaceParamsSchema,
  MyFavoritesResponseSchema,
  type AuthUser,
  type FavoritePlaceItem,
  type FavoritePlaceParams,
  type MyFavoritesResponse,
} from "@haetteum/contracts";

import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlaceFavoritesController } from "./place-favorites.controller.js";

const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const favorite: FavoritePlaceItem = {
  id: PLACE_ID,
  title: "에버랜드",
  location: "경기 용인",
  primaryImageUrl: "https://example.test/everland.jpg",
  favoritedAt: "2026-08-25T03:00:00.000Z",
};
const currentUser: AuthUser = {
  id: "30000000-0000-4000-8000-000000000001",
  displayName: "로그인 여행자",
  profileImageUrl: null,
  provider: "KAKAO",
};

function validationPipe(
  method: keyof PlaceFavoritesController,
  index: number,
): ZodValidationPipe<unknown> {
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    PlaceFavoritesController,
    method,
  ) as Record<string, { index: number; pipes: unknown[] }>;
  const argument = Object.values(args).find((value) => value.index === index);

  return argument?.pipes[0] as ZodValidationPipe<unknown>;
}

function handler(
  method: keyof PlaceFavoritesController,
): (...args: unknown[]) => unknown {
  return Object.getOwnPropertyDescriptor(
    PlaceFavoritesController.prototype,
    method,
  )?.value as (...args: unknown[]) => unknown;
}

describe("PlaceFavoritesController", () => {
  it("delegates each validated request shape to the matching favorites service method", async () => {
    const response: MyFavoritesResponse = { items: [favorite] };
    const favorites = {
      listMine: jest
        .fn<(userId: string) => Promise<MyFavoritesResponse>>()
        .mockResolvedValue(response),
      add: jest
        .fn<(userId: string, placeId: string) => Promise<FavoritePlaceItem>>()
        .mockResolvedValue(favorite),
      remove: jest
        .fn<(userId: string, placeId: string) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    const controller = new PlaceFavoritesController(favorites as never);
    const params: FavoritePlaceParams = { placeId: PLACE_ID };

    await expect(controller.listMine(currentUser)).resolves.toEqual(response);
    await expect(controller.add(currentUser, params)).resolves.toEqual(
      favorite,
    );
    await expect(
      controller.remove(currentUser, params),
    ).resolves.toBeUndefined();

    expect(favorites.listMine).toHaveBeenCalledWith(currentUser.id);
    expect(favorites.add).toHaveBeenCalledWith(currentUser.id, PLACE_ID);
    expect(favorites.remove).toHaveBeenCalledWith(currentUser.id, PLACE_ID);
  });

  it("registers the versioned favorites routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, PlaceFavoritesController)).toBe(
      "favorites",
    );
    expect(
      Reflect.getMetadata(VERSION_METADATA, PlaceFavoritesController),
    ).toBe("1");

    expect(Reflect.getMetadata(PATH_METADATA, handler("listMine"))).toBe(
      "mine",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("listMine"))).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("add"))).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, handler("add"))).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("remove"))).toBe(
      ":placeId",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("remove"))).toBe(
      RequestMethod.DELETE,
    );
  });

  it("responds with 204 when removing a favorite", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("remove"))).toBe(
      204,
    );
  });

  it("requires the session and same-origin guards for every favorites route", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PlaceFavoritesController),
    ).toEqual([SessionAuthGuard, SameOriginGuard]);
  });

  it("receives the authenticated user through CurrentUser on every route", () => {
    for (const [method, index] of [
      ["listMine", 0],
      ["add", 0],
      ["remove", 0],
    ] as const) {
      const args = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        PlaceFavoritesController,
        method,
      ) as Record<
        string,
        {
          index: number;
          factory?: (data: unknown, context: ExecutionContext) => unknown;
        }
      >;
      const argument = Object.values(args).find(
        (value) => value.index === index,
      );
      const factory = argument?.factory;
      if (!factory)
        throw new Error(`Missing CurrentUser metadata on ${method}`);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ auth: { user: currentUser } }),
        }),
      } as unknown as ExecutionContext;

      expect(factory(undefined, context)).toEqual(currentUser);
    }
  });

  it("registers the shared favorites schema in parameter and body validation pipes", () => {
    const paramsMetadata = {
      type: "param",
      metatype: Object,
      data: undefined,
    } as const;
    const bodyMetadata = {
      type: "body",
      metatype: Object,
      data: undefined,
    } as const;

    expect(validationPipe("add", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("add", 1).transform({ placeId: PLACE_ID }, bodyMetadata),
    ).toEqual(FavoritePlaceParamsSchema.parse({ placeId: PLACE_ID }));
    expect(validationPipe("remove", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("remove", 1).transform(
        { placeId: PLACE_ID },
        paramsMetadata,
      ),
    ).toEqual(FavoritePlaceParamsSchema.parse({ placeId: PLACE_ID }));
  });

  it("parses every service result through the public response schemas", async () => {
    const invalidFavorite = { ...favorite, favoritedAt: "not-an-iso-date" };
    const favorites = {
      listMine: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        items: [invalidFavorite],
      }),
      add: jest.fn<() => Promise<unknown>>().mockResolvedValue(invalidFavorite),
      remove: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const controller = new PlaceFavoritesController(favorites as never);
    const params: FavoritePlaceParams = { placeId: PLACE_ID };

    await expect(controller.listMine(currentUser)).rejects.toThrow();
    await expect(controller.add(currentUser, params)).rejects.toThrow();
  });

  it("removes fields that are not part of the public favorite contract", async () => {
    const favorites = {
      listMine: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        items: [{ ...favorite, internalOnly: "do-not-leak" }],
      }),
      add: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ ...favorite, internalOnly: "do-not-leak" }),
      remove: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const controller = new PlaceFavoritesController(favorites as never);
    const params: FavoritePlaceParams = { placeId: PLACE_ID };

    await expect(controller.listMine(currentUser)).resolves.toEqual(
      MyFavoritesResponseSchema.parse({ items: [favorite] }),
    );
    await expect(controller.add(currentUser, params)).resolves.toEqual(
      FavoritePlaceItemSchema.parse(favorite),
    );
  });
});
