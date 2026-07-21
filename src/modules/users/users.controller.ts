import { Response } from "express";
import { usersService } from "./users.service";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import type { ListUsersQuery, UpdateUserInput } from "./users.schema";

export const usersController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const result = await usersService.list(req.query as unknown as ListUsersQuery);
    res.status(200).json({ data: result.items, pagination: result.pagination });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const user = await usersService.getById(req.params.id);
    res.status(200).json({ data: user });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const user = await usersService.update(req.params.id, req.body as UpdateUserInput, req.user!.id);
    res.status(200).json({ data: user });
  },

  async remove(req: AuthenticatedRequest, res: Response) {
    await usersService.softDelete(req.params.id, req.user!.id);
    res.status(200).json({ data: { deleted: true } });
  },
};
