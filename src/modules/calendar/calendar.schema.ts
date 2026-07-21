import { z } from "zod";

export const listEventsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const createEventSchema = z.object({
  eventTime: z.string().datetime(),
  country: z.string().min(1).max(60),
  currency: z.string().min(2).max(6),
  title: z.string().min(1).max(200),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  previous: z.string().max(30).optional(),
  forecast: z.string().max(30).optional(),
  actual: z.string().max(30).optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;
