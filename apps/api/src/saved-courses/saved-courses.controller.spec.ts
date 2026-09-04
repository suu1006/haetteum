import {
  NotFoundException,
  RequestMethod,
  type ExecutionContext,
} from "@nestjs/common";
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
  MySavedCoursesResponseSchema,
  SaveCourseRequestSchema,
  SavedCourseIdParamsSchema,
  SavedCourseItemSchema,
  UpdateSavedCourseRequestSchema,
  type AuthUser,
  type MySavedCoursesResponse,
  type SaveCourseRequest,
  type SavedCourseIdParams,
  type SavedCourseItem,
} from "@haetteum/contracts";

import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { SavedCoursesController } from "./saved-courses.controller.js";

const COURSE_ID = "40000000-0000-4000-8000-000000000001";
const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const savedCourse: SavedCourseItem = {
  id: COURSE_ID,
  title: "예술의전당 근처 코스",
  savedAt: "2026-09-01T03:00:00.000Z",
  stops: [
    {
      role: "anchor",
      sequence: 1,
      placeId: PLACE_ID,
      title: "예술의전당",
      categoryLabel: null,
      address: "서울 서초구 서초동",
      longitude: 127.01,
      latitude: 37.48,
      distanceMeters: null,
      placeUrl: null,
    },
  ],
};
const saveRequest: SaveCourseRequest = {
  title: savedCourse.title,
  stops: savedCourse.stops,
};
const currentUser: AuthUser = {
  id: "30000000-0000-4000-8000-000000000001",
  displayName: "로그인 여행자",
  profileImageUrl: null,
};

function validationPipe(
  method: keyof SavedCoursesController,
  index: number,
): ZodValidationPipe<unknown> {
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    SavedCoursesController,
    method,
  ) as Record<string, { index: number; pipes: unknown[] }>;
  const argument = Object.values(args).find((value) => value.index === index);

  return argument?.pipes[0] as ZodValidationPipe<unknown>;
}

function handler(
  method: keyof SavedCoursesController,
): (...args: unknown[]) => unknown {
  return Object.getOwnPropertyDescriptor(
    SavedCoursesController.prototype,
    method,
  )?.value as (...args: unknown[]) => unknown;
}

describe("SavedCoursesController", () => {
  it("delegates each validated request shape to the matching saved-courses service method", async () => {
    const response: MySavedCoursesResponse = { items: [savedCourse] };
    const savedCourses = {
      listMine: jest
        .fn<(userId: string) => Promise<MySavedCoursesResponse>>()
        .mockResolvedValue(response),
      findOne: jest
        .fn<
          (userId: string, id: string) => Promise<SavedCourseItem | null>
        >()
        .mockResolvedValue(savedCourse),
      create: jest
        .fn<
          (
            userId: string,
            input: SaveCourseRequest,
          ) => Promise<SavedCourseItem>
        >()
        .mockResolvedValue(savedCourse),
      update: jest
        .fn<
          (
            userId: string,
            id: string,
            input: SaveCourseRequest,
          ) => Promise<SavedCourseItem>
        >()
        .mockResolvedValue(savedCourse),
      remove: jest
        .fn<(userId: string, id: string) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    const controller = new SavedCoursesController(savedCourses as never);
    const params: SavedCourseIdParams = { id: COURSE_ID };

    await expect(controller.listMine(currentUser)).resolves.toEqual(response);
    await expect(
      controller.findOne(currentUser, params),
    ).resolves.toEqual(savedCourse);
    await expect(
      controller.save(currentUser, saveRequest),
    ).resolves.toEqual(savedCourse);
    await expect(
      controller.update(currentUser, params, saveRequest),
    ).resolves.toEqual(savedCourse);
    await expect(
      controller.remove(currentUser, params),
    ).resolves.toBeUndefined();

    expect(savedCourses.listMine).toHaveBeenCalledWith(currentUser.id);
    expect(savedCourses.findOne).toHaveBeenCalledWith(
      currentUser.id,
      COURSE_ID,
    );
    expect(savedCourses.create).toHaveBeenCalledWith(
      currentUser.id,
      saveRequest,
    );
    expect(savedCourses.update).toHaveBeenCalledWith(
      currentUser.id,
      COURSE_ID,
      saveRequest,
    );
    expect(savedCourses.remove).toHaveBeenCalledWith(
      currentUser.id,
      COURSE_ID,
    );
  });

  it("raises a 404 when the saved course cannot be found for the current user", async () => {
    const savedCourses = {
      findOne: jest
        .fn<(userId: string, id: string) => Promise<SavedCourseItem | null>>()
        .mockResolvedValue(null),
    };
    const controller = new SavedCoursesController(savedCourses as never);
    const params: SavedCourseIdParams = { id: COURSE_ID };

    await expect(
      controller.findOne(currentUser, params),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("registers the versioned saved-courses routes", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, SavedCoursesController),
    ).toBe("saved-courses");
    expect(
      Reflect.getMetadata(VERSION_METADATA, SavedCoursesController),
    ).toBe("1");

    expect(Reflect.getMetadata(PATH_METADATA, handler("listMine"))).toBe(
      "mine",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("listMine"))).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("findOne"))).toBe(
      ":id",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("findOne"))).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("save"))).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, handler("save"))).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("update"))).toBe(":id");
    expect(Reflect.getMetadata(METHOD_METADATA, handler("update"))).toBe(
      RequestMethod.PATCH,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler("remove"))).toBe(":id");
    expect(Reflect.getMetadata(METHOD_METADATA, handler("remove"))).toBe(
      RequestMethod.DELETE,
    );
  });

  it("responds with 204 when removing a saved course", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("remove"))).toBe(
      204,
    );
  });

  it("requires the session and same-origin guards for every saved-courses route", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SavedCoursesController),
    ).toEqual([SessionAuthGuard, SameOriginGuard]);
  });

  it("receives the authenticated user through CurrentUser on every route", () => {
    for (const [method, index] of [
      ["listMine", 0],
      ["findOne", 0],
      ["save", 0],
      ["update", 0],
      ["remove", 0],
    ] as const) {
      const args = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        SavedCoursesController,
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

  it("registers the shared saved-course schemas in body and parameter validation pipes", () => {
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

    expect(validationPipe("findOne", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("findOne", 1).transform(
        { id: COURSE_ID },
        paramsMetadata,
      ),
    ).toEqual(SavedCourseIdParamsSchema.parse({ id: COURSE_ID }));
    expect(validationPipe("save", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("save", 1).transform(saveRequest, bodyMetadata),
    ).toEqual(SaveCourseRequestSchema.parse(saveRequest));
    expect(validationPipe("update", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("update", 1).transform({ id: COURSE_ID }, paramsMetadata),
    ).toEqual(SavedCourseIdParamsSchema.parse({ id: COURSE_ID }));
    expect(validationPipe("update", 2)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("update", 2).transform(saveRequest, bodyMetadata),
    ).toEqual(UpdateSavedCourseRequestSchema.parse(saveRequest));
    expect(validationPipe("remove", 1)).toBeInstanceOf(ZodValidationPipe);
    expect(
      validationPipe("remove", 1).transform({ id: COURSE_ID }, paramsMetadata),
    ).toEqual(SavedCourseIdParamsSchema.parse({ id: COURSE_ID }));
  });

  it("parses every service result through the public response schemas", async () => {
    const invalidCourse = { ...savedCourse, savedAt: "not-an-iso-date" };
    const savedCourses = {
      listMine: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        items: [invalidCourse],
      }),
      findOne: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(invalidCourse),
      create: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(invalidCourse),
      update: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(invalidCourse),
      remove: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const controller = new SavedCoursesController(savedCourses as never);
    const params: SavedCourseIdParams = { id: COURSE_ID };

    await expect(controller.listMine(currentUser)).rejects.toThrow();
    await expect(
      controller.findOne(currentUser, params),
    ).rejects.toThrow();
    await expect(
      controller.save(currentUser, saveRequest),
    ).rejects.toThrow();
    await expect(
      controller.update(currentUser, params, saveRequest),
    ).rejects.toThrow();
  });

  it("removes fields that are not part of the public saved-course contract", async () => {
    const savedCourses = {
      listMine: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        items: [{ ...savedCourse, internalOnly: "do-not-leak" }],
      }),
      findOne: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ ...savedCourse, internalOnly: "do-not-leak" }),
      create: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ ...savedCourse, internalOnly: "do-not-leak" }),
      update: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ ...savedCourse, internalOnly: "do-not-leak" }),
      remove: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const controller = new SavedCoursesController(savedCourses as never);
    const params: SavedCourseIdParams = { id: COURSE_ID };

    await expect(controller.listMine(currentUser)).resolves.toEqual(
      MySavedCoursesResponseSchema.parse({ items: [savedCourse] }),
    );
    await expect(
      controller.findOne(currentUser, params),
    ).resolves.toEqual(SavedCourseItemSchema.parse(savedCourse));
    await expect(
      controller.save(currentUser, saveRequest),
    ).resolves.toEqual(SavedCourseItemSchema.parse(savedCourse));
    await expect(
      controller.update(currentUser, params, saveRequest),
    ).resolves.toEqual(SavedCourseItemSchema.parse(savedCourse));
  });
});
