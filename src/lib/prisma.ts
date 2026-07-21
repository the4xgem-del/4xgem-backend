import { PrismaClient } from "@prisma/client";
import { isProd } from "@/config/env";

// Prevent multiple PrismaClient instances during dev hot-reload.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProd ? ["error", "warn"] : ["warn", "error"],
  });

if (!isProd) {
  global.__prisma = prisma;
}
