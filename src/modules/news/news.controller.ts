import { Request, Response } from "express";
import { newsService } from "./news.service";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import type { ListNewsQuery, CreateNewsInput } from "./news.schema";

export const newsController = {
  async list(req: Request, res: Response) {
    const result = await newsService.list(
      req.query as unknown as ListNewsQuery,
    );

    res.status(200).json({
      data: result.items,
      pagination: result.pagination,
    });
  },

  async getById(req: Request, res: Response) {
    const article = await newsService.getById(req.params.id);

    res.status(200).json({
      data: article,
    });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const article = await newsService.create(
      req.user!.id,
      req.body as CreateNewsInput,
    );

    res.status(201).json({
      data: article,
    });
  },
};