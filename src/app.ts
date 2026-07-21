import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env, isProd } from "@/config/env";
import { logger } from "@/utils/logger";
import { apiRouter } from "@/routes";
import { errorHandler, notFoundHandler } from "@/middleware/error.middleware";
import { apiLimiter } from "@/middleware/rateLimit.middleware";
import { generateCsrfToken, doubleCsrfProtection } from "@/config/csrf";
import { swaggerSpec } from "@/config/swagger";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // required for correct req.ip / rate limiting behind Nginx/ELB

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind's runtime injects inline styles
          imgSrc: ["'self'", "data:", "https:"], // avatar/S3 images can come from any https host
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          ...(isProd ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
      crossOriginResourcePolicy: { policy: "cross-origin" }, // API is consumed by a separate frontend origin
    }),
  );
  app.use(
    cors({
      origin: env.WEB_APP_URL,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // Stripe requires the exact raw request bytes to verify its signature, so
  // this must be parsed as a raw Buffer BEFORE the global JSON parser below
  // (which will safely skip re-parsing this same request afterwards).
  app.use("/api/v1/billing/webhook", express.raw({ type: "application/json" }));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(pinoHttp({ logger }));

  app.use("/api", apiLimiter);

  // CSRF token issuance — frontend calls this once on load, then attaches
  // the token to every mutating request via the x-csrf-token header.
  app.get("/api/v1/csrf-token", (req: Request, res: Response) => {
    res.json({ data: { csrfToken: generateCsrfToken(req, res) } });
  });

  // Enforce CSRF on cookie-authenticated mutating requests, except auth
  // endpoints that establish the session in the first place and webhook
  // endpoints authenticated by signature instead of cookies.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const exempt =
      req.path.startsWith("/api/v1/auth/login") ||
      req.path.startsWith("/api/v1/auth/register") ||
      req.path.startsWith("/api/v1/auth/google") ||
      req.path.startsWith("/api/v1/auth/2fa/login-verify") ||
      req.path.startsWith("/api/v1/billing/webhook");
    if (exempt || ["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    return doubleCsrfProtection(req, res, next);
  });

  if (!isProd) {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
