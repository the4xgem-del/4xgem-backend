"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meController = void 0;
const me_service_1 = require("./me.service");
exports.meController = {
    async updateProfile(req, res) {
        const user = await me_service_1.meService.updateProfile(req.user.id, req.body);
        res.status(200).json({ data: user });
    },
    async getPreferences(req, res) {
        const prefs = await me_service_1.meService.getPreferences(req.user.id);
        res.status(200).json({ data: prefs });
    },
    async updatePreferences(req, res) {
        const prefs = await me_service_1.meService.updatePreferences(req.user.id, req.body);
        res.status(200).json({ data: prefs });
    },
    async uploadAvatar(req, res) {
        if (!req.file) {
            res.status(400).json({ error: { code: "BAD_REQUEST", message: "No file uploaded." } });
            return;
        }
        const user = await me_service_1.meService.uploadAvatar(req.user.id, req.file);
        res.status(200).json({ data: user });
    },
    async listSessions(req, res) {
        const sessions = await me_service_1.meService.listSessions(req.user.id);
        res.status(200).json({ data: sessions });
    },
    async revokeSession(req, res) {
        await me_service_1.meService.revokeSession(req.user.id, req.params.id);
        res.status(200).json({ data: { revoked: true } });
    },
    async revokeAllSessions(req, res) {
        await me_service_1.meService.revokeAllSessions(req.user.id);
        res.status(200).json({ data: { revoked: true } });
    },
};
//# sourceMappingURL=me.controller.js.map