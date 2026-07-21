import { OAuth2Client } from "google-auth-library";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";

export interface GoogleIdentity {
  googleId: string; // the token's "sub" claim — stable, unique per Google account
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

const configuredAudiences = [env.GOOGLE_CLIENT_ID, env.GOOGLE_ANDROID_CLIENT_ID, env.GOOGLE_IOS_CLIENT_ID].filter(
  (v): v is string => Boolean(v),
);

// A single client instance is fine — verifyIdToken() takes the audience
// list per call, it doesn't bind the client to one client ID.
const client = new OAuth2Client();

/**
 * Verifies a Google-issued ID token (from any platform's Google Sign-In
 * SDK — web GIS, Android Credential Manager/Google Sign-In, or iOS
 * GoogleSignIn) against every OAuth client ID configured for this project.
 * This is what makes the same backend endpoint work across Web, Android,
 * and iOS: each platform has its own client ID in Google Cloud Console,
 * but they all mint ID tokens that verify successfully here as long as
 * that platform's client ID is included in the configured audiences.
 *
 * Throws ApiError(503) if Google Sign-In isn't configured at all, or
 * ApiError(401/403) if the token is invalid, expired, or its email isn't
 * verified by Google.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (configuredAudiences.length === 0) {
    throw new ApiError(503, "GOOGLE_SIGNIN_NOT_CONFIGURED", "Google Sign-In isn't configured yet.");
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: configuredAudiences });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "That Google sign-in couldn't be verified. Please try again.");
  }

  if (!payload?.sub || !payload.email) {
    throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "Google didn't return the expected account details.");
  }

  if (!payload.email_verified) {
    throw new ApiError(403, "GOOGLE_EMAIL_UNVERIFIED", "Your Google account's email address isn't verified.");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: true,
    firstName: payload.given_name,
    lastName: payload.family_name,
    avatarUrl: payload.picture,
  };
}
