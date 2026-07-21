"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isProd = exports.env = void 0;
const zod_1 = require("zod");
require("dotenv/config");
/**
 * All runtime configuration is read from environment variables and validated
 * once at startup. This is the ONLY file that should call `process.env`
 * directly — everything else imports `env` from here.
 *
 * Point DATABASE_URL / REDIS_URL / S3_* / STRIPE_* at real managed services
 * (RDS, ElastiCache/Upstash, S3, Stripe) in production — no code changes
 * needed, only .env values.
 */
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    API_BASE_URL: zod_1.z.string().url().default("http://localhost:4000"),
    WEB_APP_URL: zod_1.z.string().url().default("http://localhost:5173"),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: zod_1.z.string().min(1, "REDIS_URL is required"),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32, "JWT_ACCESS_SECRET must be >= 32 chars"),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, "JWT_REFRESH_SECRET must be >= 32 chars"),
    JWT_ACCESS_TTL: zod_1.z.string().default("15m"),
    JWT_REFRESH_TTL_DAYS: zod_1.z.coerce.number().default(30),
    COOKIE_DOMAIN: zod_1.z.string().optional(),
    COOKIE_SECURE: zod_1.z.coerce.boolean().default(true),
    CSRF_SECRET: zod_1.z.string().min(32, "CSRF_SECRET must be >= 32 chars"),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    EMAIL_FROM: zod_1.z.string().default("4xGem <no-reply@4xgem.com>"),
    S3_ENDPOINT: zod_1.z.string().optional(),
    S3_REGION: zod_1.z.string().default("us-east-1"),
    S3_BUCKET: zod_1.z.string().optional(),
    S3_ACCESS_KEY_ID: zod_1.z.string().optional(),
    S3_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // Google Sign-In. GOOGLE_CLIENT_ID is the web OAuth client ID (also the
    // default verification audience). GOOGLE_ANDROID_CLIENT_ID and
    // GOOGLE_IOS_CLIENT_ID are optional additional audiences so the same
    // /auth/google endpoint verifies ID tokens minted by native Google
    // Sign-In SDKs on Android/iOS too — Google issues a distinct OAuth
    // client ID per platform under the same project, and verification must
    // accept whichever of them is configured.
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_ANDROID_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_IOS_CLIENT_ID: zod_1.z.string().optional(),
    // "simulated" needs no credentials and runs a deterministic-ish random
    // walk — useful for local dev and for environments without a market
    // data subscription. Set to "twelvedata" + TWELVE_DATA_API_KEY for real
    // prices. Twelve Data's WebSocket streaming requires their Pro plan or
    // above; on lower plans the provider automatically falls back to REST
    // polling (still real data, just not push-based).
    MARKET_DATA_PROVIDER: zod_1.z.enum(["simulated", "twelvedata"]).default("simulated"),
    TWELVE_DATA_API_KEY: zod_1.z.string().optional(),
    MARKET_DATA_POLL_INTERVAL_MS: zod_1.z.coerce.number().default(10_000),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(60_000),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().default(100),
    LOG_LEVEL: zod_1.z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
exports.isProd = exports.env.NODE_ENV === "production";
exports.isTest = exports.env.NODE_ENV === "test";
//# sourceMappingURL=env.js.map