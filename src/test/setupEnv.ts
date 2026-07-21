// Loaded via vitest.config.ts `setupFiles`. Sets required env vars BEFORE
// any application module (which validate process.env at import time) is
// imported by a test file.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/fourxgem_test?schema=public";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
process.env.CSRF_SECRET ??= "test-csrf-secret-ccccccccccccccccccccccccccccccccccccc";
process.env.COOKIE_SECURE = "false";
process.env.RATE_LIMIT_MAX = "1000"; // generous — individual tests set tighter limits where they test rate limiting itself
