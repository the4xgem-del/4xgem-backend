import { Response } from "express";
import { signalsService } from "./signals.service";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import type { ListSignalsQuery, CreateSignalInput } from "./signals.schema";

export const signalsController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const result = await signalsService.list(req.query as unknown as ListSignalsQuery, req.user?.id);
    res.status(200).json({ data: result.items, pagination: result.pagination });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const signal = await signalsService.getById(req.params.id, req.user?.id);
    res.status(200).json({ data: signal });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const signal = await signalsService.create(req.user!.id, req.body as CreateSignalInput);
    res.status(201).json({ data: signal });
  },
};
