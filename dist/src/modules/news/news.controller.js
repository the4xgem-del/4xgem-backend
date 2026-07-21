"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsController = void 0;
const news_service_1 = require("./news.service");
exports.newsController = {
    async list(req, res) {
        const result = await news_service_1.newsService.list(req.query);
        res.status(200).json({ data: result.items, pagination: result.pagination });
    },
    async getById(req, res) {
        const article = await news_service_1.newsService.getById(req.params.id);
        res.status(200).json({ data: article });
    },
    async create(req, res) {
        const article = await news_service_1.newsService.create(req.user.id, req.body);
        res.status(201).json({ data: article });
    },
};
//# sourceMappingURL=news.controller.js.map