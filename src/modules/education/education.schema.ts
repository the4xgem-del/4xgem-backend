import { z } from "zod";

export const updateProgressSchema = z.object({
  progressPercent: z.coerce.number().int().min(0).max(100),
});
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
