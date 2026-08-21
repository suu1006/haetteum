import {
  BadRequestException,
  type ArgumentMetadata,
  type PipeTransform,
} from "@nestjs/common";
import type { z } from "zod";

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown, metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      detail: "요청값이 올바르지 않습니다.",
      errors: result.error.issues.map((issue) => ({
        path: [metadata.type, ...issue.path].join("."),
        message: issue.message,
      })),
    });
  }
}
