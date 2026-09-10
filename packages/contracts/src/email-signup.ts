import { z } from "zod";

import { AuthUserSchema } from "./auth.js";

const EmailSchema = z.string().trim().toLowerCase().email().max(255);
const PasswordSchema = z
  .string()
  .min(8, "8자 이상 입력해주세요.")
  .max(72, "비밀번호가 너무 길어요.")
  .regex(/[A-Za-z]/, "영문을 포함해주세요.")
  .regex(/[0-9]/, "숫자를 포함해주세요.")
  .regex(/[^A-Za-z0-9]/, "특수문자를 포함해주세요.");
const VerificationCodeSchema = z.string().regex(/^\d{6}$/, "6자리 숫자를 입력해주세요.");

export const EmailSignupStartRequestSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
  })
  .strict();
export type EmailSignupStartRequest = z.infer<
  typeof EmailSignupStartRequestSchema
>;

export const EmailSignupStartResponseSchema = z.object({
  codeExpiresAt: z.iso.datetime(),
});
export type EmailSignupStartResponse = z.infer<
  typeof EmailSignupStartResponseSchema
>;

export const EmailSignupVerifyRequestSchema = z
  .object({
    email: EmailSchema,
    code: VerificationCodeSchema,
  })
  .strict();
export type EmailSignupVerifyRequest = z.infer<
  typeof EmailSignupVerifyRequestSchema
>;

export const EmailSignupVerifyResponseSchema = z.object({
  verified: z.literal(true),
  user: AuthUserSchema,
});
export type EmailSignupVerifyResponse = z.infer<
  typeof EmailSignupVerifyResponseSchema
>;

export const EmailLoginRequestSchema = z
  .object({
    email: EmailSchema,
    password: z.string().min(1).max(72),
  })
  .strict();
export type EmailLoginRequest = z.infer<typeof EmailLoginRequestSchema>;
