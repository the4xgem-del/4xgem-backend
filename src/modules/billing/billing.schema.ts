import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
  planId: z.string().uuid(),
});
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
