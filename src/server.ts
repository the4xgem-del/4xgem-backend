import { createApp } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { startMarketData, stopMarketData, marketDataProvider, getMarketDataHealth } from "@/lib/marketData";
import { instrumentForSymbol } from "@/lib/marketData/instruments";
import { attachMarketWebSocketServer } from "@/ws/server";
import { signalsService } from "@/modules/signals/signals.service";
import type { Tick } from "@/lib/marketData/types";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 4xGem API listening on :${env.PORT} [${env.NODE_ENV}]`);
  if (env.NODE_ENV !== "production") {
    logger.info(`📚 Swagger docs: ${env.API_BASE_URL}/api-docs`);
  }
});

// ── Real-time market data: provider -> WebSocket broadcast + signal auto-updates ──
const marketWs = attachMarketWebSocketServer(server);

marketDataProvider.on("status", () => {
  marketWs.broadcastStatus(getMarketDataHealth());
});

marketDataProvider.on("tick", (tick: Tick) => {
  marketWs.broadcastTick(tick);

  const instrument = instrumentForSymbol(tick.symbol);
  if (!instrument) return;

  signalsService
    .applyPriceUpdate(instrument.displayPair, tick.price)
    .then((updated) => {
      if (updated.length > 0) {
        marketWs.broadcastSignalUpdates(updated);
        logger.info(
          { pair: instrument.displayPair, price: tick.price, count: updated.length },
          "Signal(s) auto-updated from live price",
        );
      }
    })
    .catch((err) => logger.error({ err }, "Failed to apply price update to signals"));
});

startMarketData().catch((err) => logger.error({ err }, "Failed to start market data provider"));

async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);
  stopMarketData();
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
