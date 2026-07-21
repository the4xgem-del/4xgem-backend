"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersService = void 0;
const prisma_1 = require("../../lib/prisma");
const ApiError_1 = require("../../utils/ApiError");
const client_1 = require("@prisma/client");
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
};
exports.usersService = {
    async list(query) {
        const where = {
            ...(query.search
                ? {
                    OR: [
                        { email: { contains: query.search, mode: "insensitive" } },
                        { firstName: { contains: query.search, mode: "insensitive" } },
                        { lastName: { contains: query.search, mode: "insensitive" } },
                    ],
                }
                : {}),
            ...(query.role ? { role: { name: query.role } } : {}),
            ...(query.status ? { status: query.status } : {}),
            deletedAt: null,
        };
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.findMany({
                where,
                select: ADMIN_USER_SELECT,
                orderBy: { createdAt: "desc" },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma_1.prisma.user.count({ where }),
        ]);
        return {
            items,
            pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
        };
    },
    async getById(id) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id }, select: ADMIN_USER_SELECT });
        if (!user)
            throw ApiError_1.ApiError.notFound("User not found.");
        return user;
    },
    async update(id, input, actingAdminId) {
        if (id === actingAdminId && input.role && input.role !== client_1.RoleName.ADMIN) {
            throw ApiError_1.ApiError.badRequest("You can't demote yourself out of the Admin role.");
        }
        if (id === actingAdminId && input.status && input.status !== "ACTIVE") {
            throw ApiError_1.ApiError.badRequest("You can't change your own account status.");
        }
        const data = {};
        if (input.role) {
            const role = await prisma_1.prisma.role.upsert({ where: { name: input.role }, update: {}, create: { name: input.role } });
            data.roleId = role.id;
        }
        if (input.status)
            data.status = input.status;
        const user = await prisma_1.prisma.user.update({ where: { id }, data, select: ADMIN_USER_SELECT });
        // A role/status change is security-relevant — kill existing sessions so
        // it takes effect immediately rather than waiting for token expiry.
        await prisma_1.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        return user;
    },
    async softDelete(id, actingAdminId) {
        if (id === actingAdminId)
            throw ApiError_1.ApiError.badRequest("You can't delete your own account.");
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: "DEACTIVATED" } }),
            prisma_1.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
    },
};
//# sourceMappingURL=users.service.js.map