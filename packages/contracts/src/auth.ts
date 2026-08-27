import { z } from "zod";

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(100),
  profileImageUrl: z.string().url().nullable(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
