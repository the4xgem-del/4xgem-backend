"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsService = void 0;
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const ApiError_1 = require("../../utils/ApiError");
const axios_1 = __importDefault(require("axios"));
exports.newsService = {
    async list(query) {
        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey) {
            throw new Error("NEWS_API_KEY is missing.");
        }
        const response = await axios_1.default.get("https://newsapi.org/v2/everything", {
            params: {
                q: "forex OR gold OR crypto OR bitcoin",
                language: "en",
                sortBy: "publishedAt",
                pageSize: query.pageSize,
                page: query.page,
                apiKey,
            },
        });
        const items = response.data.articles.map((article, index) => ({
            id: article.url || String(index),
            title: article.title,
            summary: article.description,
            imageUrl: article.urlToImage,
            source: article.source?.name,
            url: article.url,
            publishedAt: article.publishedAt,
        }));
        return {
            items,
            pagination: {
                page: query.page,
                pageSize: query.pageSize,
                total: response.data.totalResults,
                totalPages: Math.ceil(response.data.totalResults / query.pageSize),
            },
        };
    },
    async getById(id) {
        const article = await prisma_1.prisma.newsArticle.findUnique({ where: { id } });
        if (!article)
            throw ApiError_1.ApiError.notFound("Article not found.");
        return article;
    },
    async create(authorId, input) {
        const article = await prisma_1.prisma.newsArticle.create({ data: { ...input, authorId } });
        await invalidateListCache();
        return article;
    },
};
function paginationOf(query, total) {
    return { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
}
async function invalidateListCache() {
    // Simple approach for now — a wildcard scan would be more thorough at
    // scale, but list cache TTL is already only 60s so staleness is bounded.
    await (0, redis_1.cacheDel)("news:list:default");
}
//# sourceMappingURL=news.service.js.map