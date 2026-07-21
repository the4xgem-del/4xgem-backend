import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/utils/ApiError";
import { logger } from "@/utils/logger";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found.` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error({ err }, "Unhandled ApiError");
    res
      .status(err.statusCode)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "One or more fields are invalid.",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (
    typeof Prisma?.PrismaClientKnownRequestError === "function" &&
    err instanceof Prisma.PrismaClientKnownRequestError
  ) {
    if (err.code === "P2002") {
      res
        .status(409)
        .json({ error: { code: "CONFLICT", message: "A record with these details already exists." } });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found." } });
      return;
    }
  }

  logger.error(
    {
      err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    },
    "Unhandled error",
  );

  console.error(err);
  res
    .status(500)
    .json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
};
