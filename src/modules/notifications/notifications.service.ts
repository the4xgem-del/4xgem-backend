import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import type { ListNotificationsQuery } from "./notifications.schema";

export const notificationsService = {
  async list(userId: string, query: ListNotificationsQuery) {
    const where = { userId, ...(query.unreadOnly ? { readAt: null } : {}) };
    const [items, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      items,
      unreadCount,
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  },

  async unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },

  async markRead(userId: string, id: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw ApiError.notFound("Notification not found.");
    }
    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  },

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  },

  /** Internal helper other services can call — e.g. "new signal published". Not exposed as a public route. */
  async notify(userId: string, type: "SIGNAL" | "NEWS" | "BILLING" | "SYSTEM", title: string, body: string, metadata?: object) {
    return prisma.notification.create({ data: { userId, type, title, body, metadata } });
  },
};
