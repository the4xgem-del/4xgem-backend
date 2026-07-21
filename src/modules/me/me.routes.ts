import { Router } from "express";
import multer from "multer";
import { meController } from "./me.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { updateProfileSchema, updatePreferencesSchema } from "./me.schema";

export const meRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

meRouter.use(requireAuth);

/**
 * @openapi
 * /me:
 *   patch:
 *     summary: Update my profile (first/last name)
 *     tags: [Settings]
 */
meRouter.patch("/", validate(updateProfileSchema), asyncHandler(meController.updateProfile));

/**
 * @openapi
 * /me/avatar:
 *   post:
 *     summary: Upload a new avatar image (JPEG/PNG/WebP, max 2MB)
 *     tags: [Settings]
 */
meRouter.post("/avatar", upload.single("avatar"), asyncHandler(meController.uploadAvatar));

/**
 * @openapi
 * /me/preferences:
 *   get:
 *     summary: Get my notification/display preferences
 *     tags: [Settings]
 */
meRouter.get("/preferences", asyncHandler(meController.getPreferences));

/**
 * @openapi
 * /me/preferences:
 *   patch:
 *     summary: Update my notification/display preferences
 *     tags: [Settings]
 */
meRouter.patch("/preferences", validate(updatePreferencesSchema), asyncHandler(meController.updatePreferences));

/**
 * @openapi
 * /me/sessions:
 *   get:
 *     summary: List my active sessions (logged-in devices)
 *     tags: [Settings]
 */
meRouter.get("/sessions", asyncHandler(meController.listSessions));

/**
 * @openapi
 * /me/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Settings]
 */
meRouter.delete("/sessions/:id", asyncHandler(meController.revokeSession));

/**
 * @openapi
 * /me/sessions:
 *   delete:
 *     summary: Log out of every device (revoke all sessions)
 *     tags: [Settings]
 */
meRouter.delete("/sessions", asyncHandler(meController.revokeAllSessions));
