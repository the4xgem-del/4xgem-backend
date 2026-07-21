import { Router } from "express";
import { newsController } from "./news.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { listNewsQuerySchema, createNewsSchema } from "./news.schema";

export const newsRouter = Router();

/**
 * @openapi
 * /news:
 *   get:
 *     summary: List market news articles (public)
 *     tags: [News]
 */
newsRouter.get("/", validate(listNewsQuerySchema, "query"), asyncHandler(newsController.list));

/**
 * @openapi
 * /news/{id}:
 *   get:
 *     summary: Get a single news article
 *     tags: [News]
 */
newsRouter.get("/:id", asyncHandler(newsController.getById));

/**
 * @openapi
 * /news:
 *   post:
 *     summary: Publish a news article (editor/admin only)
 *     tags: [News]
 */
newsRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "EDITOR"),
  validate(createNewsSchema),
  asyncHandler(newsController.create),
);
