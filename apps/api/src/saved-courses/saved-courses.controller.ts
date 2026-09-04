import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

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
  type UpdateSavedCourseRequest,
} from "@haetteum/contracts";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { SavedCoursesService } from "./saved-courses.service.js";

@Controller({ path: "saved-courses", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class SavedCoursesController {
  constructor(private readonly savedCourses: SavedCoursesService) {}

  @Get("mine")
  async listMine(
    @CurrentUser() currentUser: AuthUser,
  ): Promise<MySavedCoursesResponse> {
    return MySavedCoursesResponseSchema.parse(
      await this.savedCourses.listMine(currentUser.id),
    );
  }

  @Get(":id")
  async findOne(
    @CurrentUser() currentUser: AuthUser,
    @Param(new ZodValidationPipe(SavedCourseIdParamsSchema))
    params: SavedCourseIdParams,
  ): Promise<SavedCourseItem> {
    const course = await this.savedCourses.findOne(
      currentUser.id,
      params.id,
    );
    if (!course) throw new NotFoundException();
    return SavedCourseItemSchema.parse(course);
  }

  @Post()
  async save(
    @CurrentUser() currentUser: AuthUser,
    @Body(new ZodValidationPipe(SaveCourseRequestSchema))
    input: SaveCourseRequest,
  ): Promise<SavedCourseItem> {
    return SavedCourseItemSchema.parse(
      await this.savedCourses.create(currentUser.id, input),
    );
  }

  @Patch(":id")
  async update(
    @CurrentUser() currentUser: AuthUser,
    @Param(new ZodValidationPipe(SavedCourseIdParamsSchema))
    params: SavedCourseIdParams,
    @Body(new ZodValidationPipe(UpdateSavedCourseRequestSchema))
    input: UpdateSavedCourseRequest,
  ): Promise<SavedCourseItem> {
    return SavedCourseItemSchema.parse(
      await this.savedCourses.update(currentUser.id, params.id, input),
    );
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @CurrentUser() currentUser: AuthUser,
    @Param(new ZodValidationPipe(SavedCourseIdParamsSchema))
    params: SavedCourseIdParams,
  ): Promise<void> {
    await this.savedCourses.remove(currentUser.id, params.id);
  }
}
