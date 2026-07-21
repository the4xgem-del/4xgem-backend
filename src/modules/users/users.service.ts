import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { RoleName } from "@prisma/client";
import type { ListUsersQuery, UpdateUserInput } from "./users.schema";

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { name: true } },
} as const;

export const usersService = {
  async list(query: ListUsersQuery) {
    const where = {
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" as const } },
              { firstName: { contains: query.search, mode: "insensitive" as const } },
              { lastName: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.role ? { role: { name: query.role } } : {}),
      ...(query.status ? { status: query.status } : {}),
      deletedAt: null,
    };

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items,
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: ADMIN_USER_SELECT });
    if (!user) throw ApiError.notFound("User not found.");
    return user;
  },

  async update(id: string, input: UpdateUserInput, actingAdminId: string) {
    if (id === actingAdminId && input.role && input.role !== RoleName.ADMIN) {
      throw ApiError.badRequest("You can't demote yourself out of the Admin role.");
    }
    if (id === actingAdminId && input.status && input.status !== "ACTIVE") {
      throw ApiError.badRequest("You can't change your own account status.");
    }

    const data: { roleId?: string; status?: UpdateUserInput["status"] } = {};
    if (input.role) {
      const role = await prisma.role.upsert({ where: { name: input.role }, update: {}, create: { name: input.role } });
      data.roleId = role.id;
    }
    if (input.status) data.status = input.status;

    const user = await prisma.user.update({ where: { id }, data, select: ADMIN_USER_SELECT });

    // A role/status change is security-relevant — kill existing sessions so
    // it takes effect immediately rather than waiting for token expiry.
    await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });

    return user;
  },

  async softDelete(id: string, actingAdminId: string) {
    if (id === actingAdminId) throw ApiError.badRequest("You can't delete your own account.");
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: "DEACTIVATED" } }),
      prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  },
};
