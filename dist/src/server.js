"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const prisma_1 = require("./lib/prisma");
const redis_1 = require("./lib/redis");
const marketData_1 = require("./lib/marketData");
const instruments_1 = require("./lib/marketData/instruments");
const server_1 = require("./ws/server");
const signals_service_1 = require("./modules/signals/signals.service");
const app = (0, app_1.createApp)();
const server = app.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`🚀 4xGem API listening on :${env_1.env.PORT} [${env_1.env.NODE_ENV}]`);
    if (env_1.env.NODE_ENV !== "production") {
        logger_1.logger.info(`📚 Swagger docs: ${env_1.env.API_BASE_URL}/api-docs`);
    }
});
// ── Real-time market data: provider -> WebSocket broadcast + signal auto-updates ──
const marketWs = (0, server_1.attachMarketWebSocketServer)(server);
marketData_1.marketDataProvider.on("status", () => {
    marketWs.broadcastStatus((0, marketData_1.getMarketDataHealth)());
});
marketData_1.marketDataProvider.on("tick", (tick) => {
    marketWs.broadcastTick(tick);
    const instrument = (0, instruments_1.instrumentForSymbol)(tick.symbol);
    if (!instrument)
        return;
    signals_service_1.signalsService
        .applyPriceUpdate(instrument.displayPair, tick.price)
        .then((updated) => {
        if (updated.length > 0) {
            marketWs.broadcastSignalUpdates(updated);
            logger_1.logger.info({ pair: instrument.displayPair, price: tick.price, count: updated.length }, "Signal(s) auto-updated from live price");
        }
    })
        .catch((err) => logger_1.logger.error({ err }, "Failed to apply price update to signals"));
});
(0, marketData_1.startMarketData)().catch((err) => logger_1.logger.error({ err }, "Failed to start market data provider"));
async function shutdown(signal) {
    logger_1.logger.info(`${signal} received — shutting down gracefully`);
    (0, marketData_1.stopMarketData)();
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        redis_1.redis.disconnect();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
    logger_1.logger.error({ reason }, "Unhandled promise rejection");
});
//# sourceMappingURL=server.js.map