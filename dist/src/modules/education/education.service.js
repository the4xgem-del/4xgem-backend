"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.educationService = void 0;
const prisma_1 = require("../../lib/prisma");
const ApiError_1 = require("../../utils/ApiError");
exports.educationService = {
    async listWithProgress(userId) {
        const topics = await prisma_1.prisma.educationTopic.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: { progress: { where: { userId: userId ?? "__no-user__" } } },
        });
        return topics.map((t) => ({
            id: t.id,
            title: t.title,
            icon: t.icon,
            level: t.level,
            lessons: t.lessonsCount,
            color: t.color,
            progress: t.progress[0]?.progressPercent ?? 0,
        }));
    },
    async updateProgress(userId, topicId, input) {
        const topic = await prisma_1.prisma.educationTopic.findUnique({ where: { id: topicId } });
        if (!topic)
            throw ApiError_1.ApiError.notFound("Education topic not found.");
        return prisma_1.prisma.userEducationProgress.upsert({
            where: { userId_topicId: { userId, topicId } },
            update: { progressPercent: input.progressPercent, completedAt: input.progressPercent >= 100 ? new Date() : null },
            create: { userId, topicId, progressPercent: input.progressPercent },
        });
    },
};
//# sourceMappingURL=education.service.js.map