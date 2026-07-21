"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersController = void 0;
const users_service_1 = require("./users.service");
exports.usersController = {
    async list(req, res) {
        const result = await users_service_1.usersService.list(req.query);
        res.status(200).json({ data: result.items, pagination: result.pagination });
    },
    async getById(req, res) {
        const user = await users_service_1.usersService.getById(req.params.id);
        res.status(200).json({ data: user });
    },
    async update(req, res) {
        const user = await users_service_1.usersService.update(req.params.id, req.body, req.user.id);
        res.status(200).json({ data: user });
    },
    async remove(req, res) {
        await users_service_1.usersService.softDelete(req.params.id, req.user.id);
        res.status(200).json({ data: { deleted: true } });
    },
};
//# sourceMappingURL=users.controller.js.map