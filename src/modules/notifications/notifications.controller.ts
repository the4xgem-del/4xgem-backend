import { Response } from "express";
import { notificationsService } from "./notifications.service";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import type { ListNotificationsQuery } from "./notifications.schema";

export const notificationsController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const result = await notificationsService.list(req.user!.id, req.query as unknown as ListNotificationsQuery);
    res.status(200).json({ data: result.items, unreadCount: result.unreadCount, pagination: result.pagination });
  },

  async unreadCount(req: AuthenticatedRequest, res: Response) {
    const count = await notificationsService.unreadCount(req.user!.id);
    res.status(200).json({ data: { count } });
  },

  async markRead(req: AuthenticatedRequest, res: Response) {
    const notification = await notificationsService.markRead(req.user!.id, req.params.id);
    res.status(200).json({ data: notification });
  },

  async markAllRead(req: AuthenticatedRequest, res: Response) {
    await notificationsService.markAllRead(req.user!.id);
    res.status(200).json({ data: { marked: true } });
  },
};
