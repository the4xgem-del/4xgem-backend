import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type Target = "body" | "query" | "params";

/** Validates req[target] against a Zod schema and replaces it with the parsed (typed, coerced) value. */
export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(result.error);
    }
    (req as unknown as Record<Target, unknown>)[target] = result.data;
    return next();
  };
}
