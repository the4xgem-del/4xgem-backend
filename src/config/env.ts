import { z } from "zod";
import "dotenv/config";

/**
 * All runtime configuration is read from environment variables and validated
 * once at startup. This is the ONLY file that should call `process.env`
 * directly — everything else imports `env` from here.
 *
 * Point DATABASE_URL / REDIS_URL / S3_* / STRIPE_* at real managed services
 * (RDS, ElastiCache/Upstash, S3, Stripe) in production — no code changes
 * needed, only .env values.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  WEB_APP_URL: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be >= 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be >= 32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean().default(true),

  CSRF_SECRET: z.string().min(32, "CSRF_SECRET must be >= 32 chars"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("4xGem <no-reply@4xgem.com>"),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Google Sign-In. GOOGLE_CLIENT_ID is the web OAuth client ID (also the
  // default verification audience). GOOGLE_ANDROID_CLIENT_ID and
  // GOOGLE_IOS_CLIENT_ID are optional additional audiences so the same
  // /auth/google endpoint verifies ID tokens minted by native Google
  // Sign-In SDKs on Android/iOS too — Google issues a distinct OAuth
  // client ID per platform under the same project, and verification must
  // accept whichever of them is configured.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  GOOGLE_IOS_CLIENT_ID: z.string().optional(),

  // "simulated" needs no credentials and runs a deterministic-ish random
  // walk — useful for local dev and for environments without a market
  // data subscription. Set to "twelvedata" + TWELVE_DATA_API_KEY for real
  // prices. Twelve Data's WebSocket streaming requires their Pro plan or
  // above; on lower plans the provider automatically falls back to REST
  // polling (still real data, just not push-based).
  MARKET_DATA_PROVIDER: z.enum(["simulated", "twelvedata"]).default("simulated"),
  TWELVE_DATA_API_KEY: z.string().optional(),
  MARKET_DATA_POLL_INTERVAL_MS: z.coerce.number().default(10_000),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
