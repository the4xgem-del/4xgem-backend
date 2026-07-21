"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGoogleIdToken = verifyGoogleIdToken;
const google_auth_library_1 = require("google-auth-library");
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
const configuredAudiences = [env_1.env.GOOGLE_CLIENT_ID, env_1.env.GOOGLE_ANDROID_CLIENT_ID, env_1.env.GOOGLE_IOS_CLIENT_ID].filter((v) => Boolean(v));
// A single client instance is fine — verifyIdToken() takes the audience
// list per call, it doesn't bind the client to one client ID.
const client = new google_auth_library_1.OAuth2Client();
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
async function verifyGoogleIdToken(idToken) {
    if (configuredAudiences.length === 0) {
        throw new ApiError_1.ApiError(503, "GOOGLE_SIGNIN_NOT_CONFIGURED", "Google Sign-In isn't configured yet.");
    }
    let payload;
    try {
        const ticket = await client.verifyIdToken({ idToken, audience: configuredAudiences });
        payload = ticket.getPayload();
    }
    catch {
        throw new ApiError_1.ApiError(401, "INVALID_GOOGLE_TOKEN", "That Google sign-in couldn't be verified. Please try again.");
    }
    if (!payload?.sub || !payload.email) {
        throw new ApiError_1.ApiError(401, "INVALID_GOOGLE_TOKEN", "Google didn't return the expected account details.");
    }
    if (!payload.email_verified) {
        throw new ApiError_1.ApiError(403, "GOOGLE_EMAIL_UNVERIFIED", "Your Google account's email address isn't verified.");
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
//# sourceMappingURL=googleAuth.js.map