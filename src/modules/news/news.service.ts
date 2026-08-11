import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";
import { ApiError } from "@/utils/ApiError";
import axios from "axios";
import type { ListNewsQuery, CreateNewsInput } from "./news.schema";

export const newsService = {
  async list(query: ListNewsQuery) {
    const apiKey = process.env.GNEWS_API_KEY;

    if (!apiKey) {
      throw new Error("GNEWS_API_KEY is missing.");
    }

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 10, 10);

    const response = await axios.get(
      "https://gnews.io/api/v4/search",
      {
        params: {
          q: "(forex OR gold OR crypto OR bitcoin)",
          lang: "en",
          sortby: "publishedAt",
          max: pageSize,
          page,
          apikey: apiKey,
        },
      },
    );

    const articles = response.data.articles ?? [];
    const total = response.data.totalArticles ?? 0;

    const items = articles.map((article: any) => ({
      id: article.id || article.url,
      title: article.title,
      summary: article.description ?? "",
      imageUrl: article.image ?? "",
      source: article.source?.name ?? "Unknown",
      url: article.url,
      publishedAt: article.publishedAt,
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

  async create(authorId: string, input: CreateNewsInput) {
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