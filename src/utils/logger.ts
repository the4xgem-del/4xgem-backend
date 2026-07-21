import pino from "pino";
import { env, isProd, isTest } from "@/config/env";

function buildLogger() {
  const base = {
    level: isTest ? "silent" : env.LOG_LEVEL,
    redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash"],
  };

  if (isProd || isTest) {
    return pino(base);
  }

  // Pretty-printing in development is a nice-to-have, not a dependency the
  // app should crash over. pino-pretty runs in a worker thread that
  // resolves its target module by absolute path; in some setups (e.g. an
  // npm-workspaces monorepo where hoisting can put it in a different
  // node_modules than the one the worker resolves against) that lookup can
  // fail. Fall back to plain structured logging rather than taking the
  // whole process down over a logging cosmetic.
  try {
    return pino({
      ...base,
      transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("pino-pretty transport unavailable, falling back to plain JSON logs:", err);
    return pino(base);
  }
}

export const logger = buildLogger();
