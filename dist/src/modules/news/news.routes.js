"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsRouter = void 0;
const express_1 = require("express");
const news_controller_1 = require("./news.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const news_schema_1 = require("./news.schema");
exports.newsRouter = (0, express_1.Router)();
/**
 * @openapi
 * /news:
 *   get:
 *     summary: List market news articles (public)
 *     tags: [News]
 */
exports.newsRouter.get("/", (0, validate_middleware_1.validate)(news_schema_1.listNewsQuerySchema, "query"), (0, asyncHandler_1.asyncHandler)(news_controller_1.newsController.list));
/**
 * @openapi
 * /news/{id}:
 *   get:
 *     summary: Get a single news article
 *     tags: [News]
 */
exports.newsRouter.get("/:id", (0, asyncHandler_1.asyncHandler)(news_controller_1.newsController.getById));
/**
 * @openapi
 * /news:
 *   post:
 *     summary: Publish a news article (editor/admin only)
 *     tags: [News]
 */
exports.newsRouter.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("ADMIN", "EDITOR"), (0, validate_middleware_1.validate)(news_schema_1.createNewsSchema), (0, asyncHandler_1.asyncHandler)(news_controller_1.newsController.create));
//# sourceMappingURL=news.routes.js.map