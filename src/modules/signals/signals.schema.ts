import { z } from "zod";

export const listSignalsQuerySchema = z.object({
  category: z.enum(["FOREX", "GOLD", "CRYPTO", "INDICES", "COMMODITIES"]).optional(),
  status: z.enum(["OPEN", "RUNNING", "HIT_TP1", "HIT_TP2", "HIT_TP3", "HIT_SL", "CLOSED"]).optional(),
  sort: z.enum(["newest", "oldest", "confidence"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListSignalsQuery = z.infer<typeof listSignalsQuerySchema>;

export const createSignalSchema = z.object({
  pair: z.string().min(1).max(20),
  name: z.string().min(1).max(80),
  category: z.enum(["FOREX", "GOLD", "CRYPTO", "INDICES", "COMMODITIES"]),
  direction: z.enum(["BUY", "SELL", "BUY_LIMIT", "SELL_LIMIT"]),
  entry: z.coerce.number().positive(),
  stopLoss: z.coerce.number().positive(),
  takeProfit1: z.coerce.number().positive(),
  takeProfit2: z.coerce.number().positive().optional(),
  takeProfit3: z.coerce.number().positive().optional(),
  riskPercent: z.coerce.number().min(0.1).max(10),
  confidence: z.coerce.number().int().min(0).max(100).default(50),
  requiredTier: z.enum(["FREE", "BASIC", "PREMIUM", "VIP"]).default("FREE"),
});
export type CreateSignalInput = z.infer<typeof createSignalSchema>;
