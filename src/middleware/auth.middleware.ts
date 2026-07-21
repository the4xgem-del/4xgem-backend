import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/utils/jwt";
import { ApiError } from "@/utils/ApiError";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string };
}

/**
 * Reads the access token from the httpOnly cookie (preferred) or the
 * Authorization header (for non-browser API clients), verifies it, and
 * attaches the decoded identity to `req.user`.
 */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = req.cookies?.access_token ?? bearer;

  if (!token) {
    return next(new ApiError(401, "AUTH_REQUIRED", "Authentication required."));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch {
    return next(new ApiError(401, "INVALID_TOKEN", "Session expired or invalid. Please log in again."));
  }
}

/** Role-based authorization guard. Use after `requireAuth`. */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, "AUTH_REQUIRED", "Authentication required."));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action."));
    }
    return next();
  };
}

/** Populates req.user if a valid token is present, but never blocks the request. */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = req.cookies?.access_token ?? bearer;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    // ignore — treated as anonymous
  }
  return next();
}
