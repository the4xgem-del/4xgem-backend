"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleSignInSchema = exports.twoFactorLoginSchema = exports.disableTwoFactorSchema = exports.verifyTotpSchema = exports.changePasswordSchema = exports.verifyEmailSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const passwordSchema = zod_1.z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email().toLowerCase(),
    password: passwordSchema,
    firstName: zod_1.z.string().min(1).max(60).optional(),
    lastName: zod_1.z.string().min(1).max(60).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email().toLowerCase(),
    password: zod_1.z.string().min(1),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email().toLowerCase(),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    password: passwordSchema,
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: passwordSchema,
});
exports.verifyTotpSchema = zod_1.z.object({
    token: zod_1.z.string().length(6).regex(/^\d{6}$/, "Must be a 6-digit code"),
});
exports.disableTwoFactorSchema = zod_1.z.object({
    password: zod_1.z.string().min(1),
});
exports.twoFactorLoginSchema = zod_1.z.object({
    challengeToken: zod_1.z.string().min(1),
    code: zod_1.z.string().min(6).max(14), // 6-digit TOTP or XXXX-XXXX-XXXX recovery code
});
exports.googleSignInSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(20),
});
//# sourceMappingURL=auth.schema.js.map