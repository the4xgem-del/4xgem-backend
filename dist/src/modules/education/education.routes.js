"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.educationRouter = void 0;
const express_1 = require("express");
const education_service_1 = require("./education.service");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const education_schema_1 = require("./education.schema");
exports.educationRouter = (0, express_1.Router)();
/**
 * @openapi
 * /education:
 *   get:
 *     summary: List education topics, with the current user's progress if logged in
 *     tags: [Education]
 */
exports.educationRouter.get("/", auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const topics = await education_service_1.educationService.listWithProgress(req.user?.id);
    res.status(200).json({ data: topics });
}));
/**
 * @openapi
 * /education/{topicId}/progress:
 *   put:
 *     summary: Update my progress on a topic
 *     tags: [Education]
 */
exports.educationRouter.put("/:topicId/progress", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(education_schema_1.updateProgressSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const progress = await education_service_1.educationService.updateProgress(req.user.id, req.params.topicId, req.body);
    res.status(200).json({ data: progress });
}));
//# sourceMappingURL=education.routes.js.map