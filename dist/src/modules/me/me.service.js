"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meService = void 0;
const prisma_1 = require("../../lib/prisma");
const s3_1 = require("../../lib/s3");
const ApiError_1 = require("../../utils/ApiError");
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
};
exports.meService = {
    async updateProfile(userId, input) {
        return prisma_1.prisma.user.update({ where: { id: userId }, data: input, select: PUBLIC_USER_SELECT });
    },
    async getPreferences(userId) {
        return prisma_1.prisma.userPreference.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });
    },
    async updatePreferences(userId, input) {
        return prisma_1.prisma.userPreference.upsert({
            where: { userId },
            update: input,
            create: { userId, ...input },
        });
    },
    async uploadAvatar(userId, file) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            throw ApiError_1.ApiError.badRequest("Avatar must be a JPEG, PNG, or WebP image.");
        }
        if (file.size > 2 * 1024 * 1024) {
            throw ApiError_1.ApiError.badRequest("Avatar must be under 2MB.");
        }
        const ext = file.mimetype.split("/")[1];
        const key = `avatars/${userId}-${Date.now()}.${ext}`;
        let url;
        try {
            url = await (0, s3_1.uploadToS3)({ key, body: file.buffer, contentType: file.mimetype });
        }
        catch {
            throw new ApiError_1.ApiError(503, "STORAGE_NOT_CONFIGURED", "Avatar storage isn't configured yet — set S3_* environment variables.");
        }
        return prisma_1.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url }, select: PUBLIC_USER_SELECT });
    },
    async listSessions(userId) {
        const sessions = await prisma_1.prisma.refreshToken.findMany({
            where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
        });
        return sessions;
    },
    async revokeSession(userId, sessionId) {
        const session = await prisma_1.prisma.refreshToken.findUnique({ where: { id: sessionId } });
        if (!session || session.userId !== userId)
            throw ApiError_1.ApiError.notFound("Session not found.");
        await prisma_1.prisma.refreshToken.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    },
    async revokeAllSessions(userId) {
        await prisma_1.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    },
};
//# sourceMappingURL=me.service.js.map