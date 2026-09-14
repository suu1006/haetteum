import { z } from "zod";

export const ReviewReportRequestSchema = z
  .object({
    reason: z.enum([
      "SPAM",
      "ABUSE",
      "INAPPROPRIATE",
      "PERSONAL_INFO",
      "OTHER",
    ]),
    details: z.string().trim().max(1000).default(""),
  })
  .strict();
export type ReviewReportRequest = z.infer<typeof ReviewReportRequestSchema>;

export const BlockedUsersResponseSchema = z.object({
  items: z.array(
    z.object({
      userId: z.string().uuid(),
      displayName: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
});
export type BlockedUsersResponse = z.infer<typeof BlockedUsersResponseSchema>;
