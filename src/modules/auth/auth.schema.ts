import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const verifyTotpSchema = z.object({
  token: z.string().length(6).regex(/^\d{6}$/, "Must be a 6-digit code"),
});
export type VerifyTotpInput = z.infer<typeof verifyTotpSchema>;

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
});
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorSchema>;

export const twoFactorLoginSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(6).max(14), // 6-digit TOTP or XXXX-XXXX-XXXX recovery code
});
export type TwoFactorLoginInput = z.infer<typeof twoFactorLoginSchema>;

export const googleSignInSchema = z.object({
  idToken: z.string().min(20),
});
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
