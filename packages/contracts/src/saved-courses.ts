import { z } from "zod";

import { GeneratedCourseStopSchema } from "./places.js";

export const SaveCourseRequestSchema = z.object({
  title: z.string().min(1),
  stops: z.array(GeneratedCourseStopSchema).min(1),
});

export const UpdateSavedCourseRequestSchema = SaveCourseRequestSchema;

export const SavedCourseItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  savedAt: z.iso.datetime(),
  stops: z.array(GeneratedCourseStopSchema),
});

export const MySavedCoursesResponseSchema = z.object({
  items: z.array(SavedCourseItemSchema),
});

export const SavedCourseIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type SaveCourseRequest = z.infer<typeof SaveCourseRequestSchema>;
export type UpdateSavedCourseRequest = z.infer<
  typeof UpdateSavedCourseRequestSchema
>;
export type SavedCourseItem = z.infer<typeof SavedCourseItemSchema>;
export type MySavedCoursesResponse = z.infer<
  typeof MySavedCoursesResponseSchema
>;
export type SavedCourseIdParams = z.infer<typeof SavedCourseIdParamsSchema>;
