"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarService = void 0;
const axios_1 = __importDefault(require("axios"));
const API_KEY = process.env.FMP_API_KEY;
exports.calendarService = {
    async list(query) {
        const today = new Date().toISOString().split("T")[0];
        const { data } = await axios_1.default.get("https://financialmodelingprep.com/stable/economic-calendar", {
            params: {
                from: today,
                to: today,
                apikey: API_KEY,
            },
        });
        return data;
    },
    async create(input) {
        throw new Error("Not supported");
    },
};
//# sourceMappingURL=calendar.service.js.map