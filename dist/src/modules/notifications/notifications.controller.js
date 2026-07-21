"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsController = void 0;
const notifications_service_1 = require("./notifications.service");
exports.notificationsController = {
    async list(req, res) {
        const result = await notifications_service_1.notificationsService.list(req.user.id, req.query);
        res.status(200).json({ data: result.items, unreadCount: result.unreadCount, pagination: result.pagination });
    },
    async unreadCount(req, res) {
        const count = await notifications_service_1.notificationsService.unreadCount(req.user.id);
        res.status(200).json({ data: { count } });
    },
    async markRead(req, res) {
        const notification = await notifications_service_1.notificationsService.markRead(req.user.id, req.params.id);
        res.status(200).json({ data: notification });
    },
    async markAllRead(req, res) {
        await notifications_service_1.notificationsService.markAllRead(req.user.id);
        res.status(200).json({ data: { marked: true } });
    },
};
//# sourceMappingURL=notifications.controller.js.map