import { NextFunction, Request, Response } from "express";

type AsyncRouteHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async Express handler so a rejected promise is forwarded to
 * `next()` (and therefore the error middleware) instead of crashing the
 * process or hanging the request. Generic so handlers typed against
 * `AuthenticatedRequest` (or other Request subtypes) are still accepted.
 */
export function asyncHandler<Req extends Request = Request>(fn: AsyncRouteHandler<Req>) {
  return (req: Req, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
