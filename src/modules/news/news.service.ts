import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";
import { ApiError } from "@/utils/ApiError";
import axios from "axios";
import type { ListNewsQuery, CreateNewsInput } from "./news.schema";

export const newsService = {
  async list(query: ListNewsQuery) {
    const apiKey = process.env.NEWS_API_KEY;
    const apiUrl =
      process.env.NEWS_API_URL ||
      "https://newsapi.org/v2/everything";

    if (!apiKey) {
      throw new Error("NEWS_API_KEY is missing.");
    }

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 10, 20);

    const response = await axios.get(apiUrl, {
      params: {
        q: "(forex OR gold OR bitcoin OR cryptocurrency OR ethereum)",
        language: "en",
        sortBy: "publishedAt",
        pageSize,
        page,
        apiKey,
      },
      timeout: 10000,
    });

    const articles = response.data.articles ?? [];
    const total = response.data.totalResults ?? 0;

    const items = articles.map((article: any, index: number) => ({
      id:
        article.url ||
        `${article.publishedAt}-${index}`,

      title: article.title ?? "",

      summary:
        article.description ??
        article.content ??
        "",

      imageUrl:
        article.urlToImage ??
        "",

      source:
        article.source?.name ??
        "Unknown",

      url:
        article.url ??
        "",

      publishedAt:
        article.publishedAt ??
        new Date().toISOString(),
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async getById(id: string) {
    const article = await prisma.newsArticle.findUnique({
      where: { id },
    });

    if (!article) {
      throw ApiError.notFound("Article not found.");
    }

    return article;
  },

  async create(
    authorId: string,
    input: CreateNewsInput,
  ) {
    const article = await prisma.newsArticle.create({
      data: {
        ...input,
        authorId,
      },
    });

    await invalidateListCache();

    return article;
  },
};

async function invalidateListCache() {
  await cacheDel("news:list:default");
}