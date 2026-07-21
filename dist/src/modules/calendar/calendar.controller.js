"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarController = void 0;
const calendar_service_1 = require("./calendar.service");
exports.calendarController = {
    async list(req, res) {
        console.log("CONTROLLER HIT");
        const events = await calendar_service_1.calendarService.list(req.query);
        res.json(events);
    },
    async create(req, res) {
        res.json({ success: true });
    },
};
//# sourceMappingURL=calendar.controller.js.map