import { z } from "zod";

export const listNewsQuerySchema = z.object({
  category: z.enum(["FOREX", "GOLD", "CRYPTO", "INDICES", "COMMODITIES"]).optional(),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListNewsQuery = z.infer<typeof listNewsQuerySchema>;

export const createNewsSchema = z.object({
  category: z.enum(["FOREX", "GOLD", "CRYPTO", "INDICES", "COMMODITIES"]),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  body: z.string().optional(),
});
export type CreateNewsInput = z.infer<typeof createNewsSchema>;
