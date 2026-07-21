import swaggerJsdoc from "swagger-jsdoc";
import { env } from "@/config/env";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "4xGem API",
      version: "1.0.0",
      description: "Trading signals, news, and subscription platform API",
    },
    servers: [{ url: `${env.API_BASE_URL}/api/v1` }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" },
      },
    },
  },
  apis: ["src/modules/**/*.routes.ts"],
});
