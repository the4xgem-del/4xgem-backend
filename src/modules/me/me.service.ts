import { prisma } from "@/lib/prisma";
import { uploadToS3 } from "@/lib/s3";
import { ApiError } from "@/utils/ApiError";
import type { UpdateProfileInput, UpdatePreferencesInput } from "./me.schema";

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  twoFactorEnabled: true,
  role: { select: { name: true } },
} as const;

export const meService = {
  async updateProfile(userId: string, input: UpdateProfileInput) {
    return prisma.user.update({ where: { id: userId }, data: input, select: PUBLIC_USER_SELECT });
  },

  async getPreferences(userId: string) {
    return prisma.userPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  },

  async updatePreferences(userId: string, input: UpdatePreferencesInput) {
    return prisma.userPreference.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
    });
  },

  async uploadAvatar(userId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      throw ApiError.badRequest("Avatar must be a JPEG, PNG, or WebP image.");
    }
    if (file.size > 2 * 1024 * 1024) {
      throw ApiError.badRequest("Avatar must be under 2MB.");
    }

    const ext = file.mimetype.split("/")[1];
    const key = `avatars/${userId}-${Date.now()}.${ext}`;

    let url: string;
    try {
      url = await uploadToS3({ key, body: file.buffer, contentType: file.mimetype });
    } catch {
      throw new ApiError(503, "STORAGE_NOT_CONFIGURED", "Avatar storage isn't configured yet — set S3_* environment variables.");
    }

    return prisma.user.update({ where: { id: userId }, data: { avatarUrl: url }, select: PUBLIC_USER_SELECT });
  },

  async listSessions(userId: string) {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
    });
    return sessions;
  },

  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.refreshToken.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw ApiError.notFound("Session not found.");
    await prisma.refreshToken.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  },

  async revokeAllSessions(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
