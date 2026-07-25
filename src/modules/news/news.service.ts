import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { ApiError } from "@/utils/ApiError";
import axios from "axios";
import type { ListNewsQuery, CreateNewsInput } from "./news.schema";

export const newsService = {
  async list(query: ListNewsQuery) {
const apiKey = process.env.NEWS_API_KEY;

if (!apiKey) {
  throw new Error("NEWS_API_KEY is missing.");
}

const response = await axios.get(
  "https://gnews.io/api/v4/search",
  {
    params: {
      q: "forex OR gold OR crypto OR bitcoin",
      lang: "en",
      sortby: "publishedAt",
      max: query.pageSize,
      apikey: apiKey,
    },
  }
);

console.log("GNews Response:", response.data);

const articles = response.data.articles ?? [];

const items = articles.map((article: any, index: number) => ({
  id: article.url || String(index),
  title: article.title,
  summary: article.description,
  imageUrl: article.image,
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

  async getById(id: string) {
    const article = await prisma.newsArticle.findUnique({ where: { id } });
    if (!article) throw ApiError.notFound("Article not found.");
    return article;
  },

  async create(authorId: string, input: CreateNewsInput) {
    const article = await prisma.newsArticle.create({ data: { ...input, authorId } });
    await invalidateListCache();
    return article;
  },
};

function paginationOf(query: ListNewsQuery, total: number) {
  return { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
}

async function invalidateListCache() {
  // Simple approach for now — a wildcard scan would be more thorough at
  // scale, but list cache TTL is already only 60s so staleness is bounded.
  await cacheDel("news:list:default");
}
