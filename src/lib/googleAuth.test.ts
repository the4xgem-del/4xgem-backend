import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyIdTokenMock = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    async verifyIdToken(args: unknown) {
      return verifyIdTokenMock(args);
    }
  },
}));

async function importFresh() {
  vi.resetModules();
  return import("@/lib/googleAuth");
}

function payload(overrides: Partial<Record<string, unknown>> = {}) {
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

describe("verifyGoogleIdToken — multi-platform audience configuration", () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.GOOGLE_IOS_CLIENT_ID;
  });

  it("passes only the web client ID as the audience when that's all that's configured", async () => {
    process.env.GOOGLE_CLIENT_ID = "web-client-id";
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload() });

    const { verifyGoogleIdToken } = await importFresh();
    await verifyGoogleIdToken("some-token");

    expect(verifyIdTokenMock).toHaveBeenCalledWith(expect.objectContaining({ audience: ["web-client-id"] }));
  });

  it("passes web, Android, and iOS client IDs together when all three are configured", async () => {
    process.env.GOOGLE_CLIENT_ID = "web-client-id";
    process.env.GOOGLE_ANDROID_CLIENT_ID = "android-client-id";
    process.env.GOOGLE_IOS_CLIENT_ID = "ios-client-id";
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload() });

    const { verifyGoogleIdToken } = await importFresh();
    await verifyGoogleIdToken("some-token");

    expect(verifyIdTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ audience: ["web-client-id", "android-client-id", "ios-client-id"] }),
    );
  });

  it("verifies successfully against a token minted for the Android client ID alone (native app scenario)", async () => {
    process.env.GOOGLE_ANDROID_CLIENT_ID = "android-client-id";
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload() });

    const { verifyGoogleIdToken } = await importFresh();
    const identity = await verifyGoogleIdToken("android-minted-token");

    expect(identity.email).toBe("trader@example.com");
    expect(verifyIdTokenMock).toHaveBeenCalledWith(expect.objectContaining({ audience: ["android-client-id"] }));
  });

  it("throws 503 GOOGLE_SIGNIN_NOT_CONFIGURED when no platform client ID is set at all", async () => {
    const { verifyGoogleIdToken } = await importFresh();
    await expect(verifyGoogleIdToken("some-token")).rejects.toMatchObject({
      statusCode: 503,
      code: "GOOGLE_SIGNIN_NOT_CONFIGURED",
    });
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it("throws 401 INVALID_GOOGLE_TOKEN when Google rejects the token", async () => {
    process.env.GOOGLE_CLIENT_ID = "web-client-id";
    verifyIdTokenMock.mockRejectedValue(new Error("Wrong number of segments in token"));

    const { verifyGoogleIdToken } = await importFresh();
    await expect(verifyGoogleIdToken("garbage")).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_GOOGLE_TOKEN",
    });
  });

  it("throws 403 GOOGLE_EMAIL_UNVERIFIED when the Google account's email isn't verified", async () => {
    process.env.GOOGLE_CLIENT_ID = "web-client-id";
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload({ email_verified: false }) });

    const { verifyGoogleIdToken } = await importFresh();
    await expect(verifyGoogleIdToken("some-token")).rejects.toMatchObject({
      statusCode: 403,
      code: "GOOGLE_EMAIL_UNVERIFIED",
    });
  });

  it("maps the verified payload to a GoogleIdentity with lowercased email", async () => {
    process.env.GOOGLE_CLIENT_ID = "web-client-id";
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload({ email: "Trader@Example.COM" }) });

    const { verifyGoogleIdToken } = await importFresh();
    const identity = await verifyGoogleIdToken("some-token");

    expect(identity).toEqual({
      googleId: "google-sub-1",
      email: "trader@example.com",
      emailVerified: true,
      firstName: "Ada",
      lastName: "Lovelace",
      avatarUrl: "https://example.com/pic.jpg",
    });
  });
});
