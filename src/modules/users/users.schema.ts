import { z } from "zod";

export const listUsersQuerySchema = z.object({
  search: z.string().max(120).optional(),
  role: z.enum(["ADMIN", "EDITOR", "ANALYST", "SUBSCRIBER", "USER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION", "DEACTIVATED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "ANALYST", "SUBSCRIBER", "USER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION", "DEACTIVATED"]).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
