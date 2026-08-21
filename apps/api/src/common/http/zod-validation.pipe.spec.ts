import { BadRequestException, type ArgumentMetadata } from "@nestjs/common";
import { z } from "zod";

import { ZodValidationPipe } from "./zod-validation.pipe.js";

const bodyMetadata: ArgumentMetadata = {
  type: "body",
  metatype: Object,
  data: undefined,
};

describe("ZodValidationPipe", () => {
  const schema = z.object({ name: z.string().min(1) });
  const pipe = new ZodValidationPipe(schema);

  it("returns valid values unchanged", () => {
    const value = { name: "제주" };

    expect(pipe.transform(value, bodyMetadata)).toEqual(value);
  });

  it("reports paths and messages for invalid values", () => {
    try {
      pipe.transform({ name: "" }, bodyMetadata);
      throw new Error("Expected validation to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        code: string;
        detail: string;
        errors: Array<{ path: string; message: string }>;
      };

      expect(response).toMatchObject({
        code: "VALIDATION_ERROR",
        detail: "요청값이 올바르지 않습니다.",
      });
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0]?.path).toBe("body.name");
      expect(typeof response.errors[0]?.message).toBe("string");
    }
  });
});
