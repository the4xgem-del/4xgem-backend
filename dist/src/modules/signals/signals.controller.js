"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalsController = void 0;
const signals_service_1 = require("./signals.service");
exports.signalsController = {
    async list(req, res) {
        const result = await signals_service_1.signalsService.list(req.query, req.user?.id);
        res.status(200).json({ data: result.items, pagination: result.pagination });
    },
    async getById(req, res) {
        const signal = await signals_service_1.signalsService.getById(req.params.id, req.user?.id);
        res.status(200).json({ data: signal });
    },
    async create(req, res) {
        const signal = await signals_service_1.signalsService.create(req.user.id, req.body);
        res.status(201).json({ data: signal });
    },
};
//# sourceMappingURL=signals.controller.js.map