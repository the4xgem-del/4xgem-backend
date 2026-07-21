import { Response } from "express";
import { meService } from "./me.service";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import type { UpdateProfileInput, UpdatePreferencesInput } from "./me.schema";

export const meController = {
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    const user = await meService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
    res.status(200).json({ data: user });
  },

  async getPreferences(req: AuthenticatedRequest, res: Response) {
    const prefs = await meService.getPreferences(req.user!.id);
    res.status(200).json({ data: prefs });
  },

  async updatePreferences(req: AuthenticatedRequest, res: Response) {
    const prefs = await meService.updatePreferences(req.user!.id, req.body as UpdatePreferencesInput);
    res.status(200).json({ data: prefs });
  },

  async uploadAvatar(req: AuthenticatedRequest & { file?: Express.Multer.File }, res: Response) {
    if (!req.file) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "No file uploaded." } });
      return;
    }
    const user = await meService.uploadAvatar(req.user!.id, req.file);
    res.status(200).json({ data: user });
  },

  async listSessions(req: AuthenticatedRequest, res: Response) {
    const sessions = await meService.listSessions(req.user!.id);
    res.status(200).json({ data: sessions });
  },

  async revokeSession(req: AuthenticatedRequest, res: Response) {
    await meService.revokeSession(req.user!.id, req.params.id);
    res.status(200).json({ data: { revoked: true } });
  },

  async revokeAllSessions(req: AuthenticatedRequest, res: Response) {
    await meService.revokeAllSessions(req.user!.id);
    res.status(200).json({ data: { revoked: true } });
  },
};
