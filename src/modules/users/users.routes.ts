import { Router } from "express";
import { usersController } from "./users.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { listUsersQuerySchema, updateUserSchema } from "./users.schema";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("ADMIN"));

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List/search users (admin only)
 *     tags: [Admin]
 */
usersRouter.get("/", validate(listUsersQuerySchema, "query"), asyncHandler(usersController.list));

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user by id (admin only)
 *     tags: [Admin]
 */
usersRouter.get("/:id", asyncHandler(usersController.getById));

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update a user's role or status (admin only)
 *     tags: [Admin]
 */
usersRouter.patch("/:id", validate(updateUserSchema), asyncHandler(usersController.update));

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Soft-delete (deactivate) a user (admin only)
 *     tags: [Admin]
 */
usersRouter.delete("/:id", asyncHandler(usersController.remove));
