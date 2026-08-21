import { z } from "zod";

export const ValidationIssueSchema = z.object({
  path: z.string().min(1),
  message: z.string().min(1),
});

export const ProblemDetailsSchema = z.object({
  type: z.literal("about:blank"),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  detail: z.string().min(1),
  instance: z.string().startsWith("/"),
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  requestId: z.string().uuid(),
  errors: z.array(ValidationIssueSchema).optional(),
});

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
