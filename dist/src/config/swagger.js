"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const env_1 = require("../config/env");
exports.swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: "3.0.3",
        info: {
            title: "4xGem API",
            version: "1.0.0",
            description: "Trading signals, news, and subscription platform API",
        },
        servers: [{ url: `${env_1.env.API_BASE_URL}/api/v1` }],
        components: {
            securitySchemes: {
                cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" },
            },
        },
    },
    apis: ["src/modules/**/*.routes.ts"],
});
//# sourceMappingURL=swagger.js.map