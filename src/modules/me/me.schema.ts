import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  emailAlerts: z.boolean().optional(),
  pushAlerts: z.boolean().optional(),
  telegramAlerts: z.boolean().optional(),
  favoriteInstruments: z.array(z.string().max(20)).max(50).optional(),
  timezone: z.string().max(60).optional(),
});
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
