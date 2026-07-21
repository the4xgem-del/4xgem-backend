import { doubleCsrf } from "csrf-csrf";
import { env } from "@/config/env";

/**
 * Double-submit-cookie CSRF protection. The frontend reads the token from
 * GET /api/v1/csrf-token and sends it back in the `x-csrf-token` header on
 * every mutating request; this middleware verifies it matches the cookie.
 * Only relevant for cookie-authenticated browser sessions — pure API
 * clients using Authorization: Bearer are exempt (no ambient cookie to forge).
 */
export const { generateToken: generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  cookieName: env.COOKIE_SECURE ? "__Host-csrf" : "csrf_token",
  cookieOptions: {
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  },
  size: 64,
});
