"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const verifyIdTokenMock = vitest_1.vi.fn();
vitest_1.vi.mock("google-auth-library", () => ({
    OAuth2Client: class {
        async verifyIdToken(args) {
            return verifyIdTokenMock(args);
        }
    },
}));
async function importFresh() {
    vitest_1.vi.resetModules();
    return Promise.resolve().then(() => __importStar(require("../lib/googleAuth")));
}
function payload(overrides = {}) {
    return {
        sub: "google-sub-1",
        email: "trader@example.com",
        email_verified: true,
        given_name: "Ada",
        family_name: "Lovelace",
        picture: "https://example.com/pic.jpg",
        ...overrides,
    };
}
(0, vitest_1.describe)("verifyGoogleIdToken — multi-platform audience configuration", () => {
    (0, vitest_1.beforeEach)(() => {
        verifyIdTokenMock.mockReset();
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_ANDROID_CLIENT_ID;
        delete process.env.GOOGLE_IOS_CLIENT_ID;
    });
    (0, vitest_1.it)("passes only the web client ID as the audience when that's all that's configured", async () => {
        process.env.GOOGLE_CLIENT_ID = "web-client-id";
        verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload() });
        const { verifyGoogleIdToken } = await importFresh();
        await verifyGoogleIdToken("some-token");
        (0, vitest_1.expect)(verifyIdTokenMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ audience: ["web-client-id"] }));
    });
    (0, vitest_1.it)("passes web, Android, and iOS client IDs together when all three are configured", async () => {
        process.env.GOOGLE_CLIENT_ID = "web-client-id";
        process.env.GOOGLE_ANDROID_CLIENT_ID = "android-client-id";
        process.env.GOOGLE_IOS_CLIENT_ID = "ios-client-id";
        verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload() });
        const { verifyGoogleIdToken } = await importFresh();
        await verifyGoogleIdToken("some-token");
        (0, vitest_1.expect)(verifyIdTokenMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ audience: ["web-client-id", "android-client-id", "ios-client-id"] }));
    });
    (0, vitest_1.it)("verifies successfully against a token minted for the Android client ID alone (native app scenario)", async () => {
        process.env.GOOGLE_ANDROID_CLIENT_ID = "android-client-id";
        verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload() });
        const { verifyGoogleIdToken } = await importFresh();
        const identity = await verifyGoogleIdToken("android-minted-token");
        (0, vitest_1.expect)(identity.email).toBe("trader@example.com");
        (0, vitest_1.expect)(verifyIdTokenMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ audience: ["android-client-id"] }));
    });
    (0, vitest_1.it)("throws 503 GOOGLE_SIGNIN_NOT_CONFIGURED when no platform client ID is set at all", async () => {
        const { verifyGoogleIdToken } = await importFresh();
        await (0, vitest_1.expect)(verifyGoogleIdToken("some-token")).rejects.toMatchObject({
            statusCode: 503,
            code: "GOOGLE_SIGNIN_NOT_CONFIGURED",
        });
        (0, vitest_1.expect)(verifyIdTokenMock).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("throws 401 INVALID_GOOGLE_TOKEN when Google rejects the token", async () => {
        process.env.GOOGLE_CLIENT_ID = "web-client-id";
        verifyIdTokenMock.mockRejectedValue(new Error("Wrong number of segments in token"));
        const { verifyGoogleIdToken } = await importFresh();
        await (0, vitest_1.expect)(verifyGoogleIdToken("garbage")).rejects.toMatchObject({
            statusCode: 401,
            code: "INVALID_GOOGLE_TOKEN",
        });
    });
    (0, vitest_1.it)("throws 403 GOOGLE_EMAIL_UNVERIFIED when the Google account's email isn't verified", async () => {
        process.env.GOOGLE_CLIENT_ID = "web-client-id";
        verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload({ email_verified: false }) });
        const { verifyGoogleIdToken } = await importFresh();
        await (0, vitest_1.expect)(verifyGoogleIdToken("some-token")).rejects.toMatchObject({
            statusCode: 403,
            code: "GOOGLE_EMAIL_UNVERIFIED",
        });
    });
    (0, vitest_1.it)("maps the verified payload to a GoogleIdentity with lowercased email", async () => {
        process.env.GOOGLE_CLIENT_ID = "web-client-id";
        verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload({ email: "Trader@Example.COM" }) });
        const { verifyGoogleIdToken } = await importFresh();
        const identity = await verifyGoogleIdToken("some-token");
        (0, vitest_1.expect)(identity).toEqual({
            googleId: "google-sub-1",
            email: "trader@example.com",
            emailVerified: true,
            firstName: "Ada",
            lastName: "Lovelace",
            avatarUrl: "https://example.com/pic.jpg",
        });
    });
});
//# sourceMappingURL=googleAuth.test.js.map