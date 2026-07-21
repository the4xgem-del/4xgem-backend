"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsService = void 0;
const prisma_1 = require("../../lib/prisma");
const ApiError_1 = require("../../utils/ApiError");
exports.notificationsService = {
    async list(userId, query) {
        const where = { userId, ...(query.unreadOnly ? { readAt: null } : {}) };
        const [items, total, unreadCount] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma_1.prisma.notification.count({ where }),
            prisma_1.prisma.notification.count({ where: { userId, readAt: null } }),
        ]);
        return {
            items,
            unreadCount,
            pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
        };
    },
    async unreadCount(userId) {
        return prisma_1.prisma.notification.count({ where: { userId, readAt: null } });
    },
    async markRead(userId, id) {
        const notification = await prisma_1.prisma.notification.findUnique({ where: { id } });
        if (!notification || notification.userId !== userId) {
            throw ApiError_1.ApiError.notFound("Notification not found.");
        }
        return prisma_1.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    },
    async markAllRead(userId) {
        await prisma_1.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    },
    /** Internal helper other services can call — e.g. "new signal published". Not exposed as a public route. */
    async notify(userId, type, title, body, metadata) {
        return prisma_1.prisma.notification.create({ data: { userId, type, title, body, metadata } });
    },
};
//# sourceMappingURL=notifications.service.js.map