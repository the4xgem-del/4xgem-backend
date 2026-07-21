import { Router, Response } from "express";
import { educationService } from "./education.service";
import { validate } from "@/middleware/validate.middleware";
import { optionalAuth, requireAuth } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import { updateProgressSchema, type UpdateProgressInput } from "./education.schema";

export const educationRouter = Router();

/**
 * @openapi
 * /education:
 *   get:
 *     summary: List education topics, with the current user's progress if logged in
 *     tags: [Education]
 */
educationRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const topics = await educationService.listWithProgress(req.user?.id);
    res.status(200).json({ data: topics });
  }),
);

/**
 * @openapi
 * /education/{topicId}/progress:
 *   put:
 *     summary: Update my progress on a topic
 *     tags: [Education]
 */
educationRouter.put(
  "/:topicId/progress",
  requireAuth,
  validate(updateProgressSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const progress = await educationService.updateProgress(req.user!.id, req.params.topicId, req.body as UpdateProgressInput);
    res.status(200).json({ data: progress });
  }),
);
