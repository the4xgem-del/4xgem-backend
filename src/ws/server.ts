import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyAccessToken } from "@/utils/jwt";
import { getUserActiveTier, serializeSignal } from "@/modules/signals/signals.service";
import { tierSatisfies, type PlanTierName } from "@/utils/planTier";
import { logger } from "@/utils/logger";
import type { Tick } from "@/lib/marketData/types";
import { getMarketDataHealth } from "@/lib/marketData";
import { prisma } from "@/lib/prisma";

const WS_PATH = "/ws/market";
const HEARTBEAT_INTERVAL_MS = 30_000;

interface ClientMeta {
  tier: PlanTierName;
  isAlive: boolean;
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

async function resolveTierFromRequest(cookieHeader: string | undefined): Promise<PlanTierName> {
  const token = parseCookie(cookieHeader, "access_token");
  if (!token) return "FREE";
  try {
    const payload = verifyAccessToken(token);
    return getUserActiveTier(payload.sub);
  } catch {
    return "FREE";
  }
}

export function attachMarketWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, ClientMeta>();

  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url?.split("?")[0] !== WS_PATH) return; // let other upgrade handlers (if any) deal with it
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws: WebSocket, req) => {
    const tier = await resolveTierFromRequest(req.headers.cookie);
    clients.set(ws, { tier, isAlive: true });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "provider_status", data: getMarketDataHealth() }));
    }

    ws.on("pong", () => {
      const meta = clients.get(ws);
      if (meta) meta.isAlive = true;
    });

    ws.on("close", () => clients.delete(ws));
    ws.on("error", (err) => logger.warn({ err }, "Market WS client error"));
  });

  // Drop dead connections (e.g. lost network without a clean close frame).
  const heartbeat = setInterval(() => {
    for (const [ws, meta] of clients) {
      if (!meta.isAlive) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      meta.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
  wss.on("close", () => clearInterval(heartbeat));

  function broadcastTick(tick: Tick) {
    const payload = JSON.stringify({ type: "tick", data: tick });
    for (const ws of clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  function broadcastStatus(health: unknown) {
    const payload = JSON.stringify({ type: "provider_status", data: health });
    for (const ws of clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  function broadcastSignalUpdates(signals: Awaited<ReturnType<typeof prisma.tradingSignal.update>>[]) {
    if (signals.length === 0 || clients.size === 0) return;
    for (const [ws, meta] of clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const payload = JSON.stringify({
        type: "signal_update",
        data: signals.map((s) => serializeSignal(s, tierSatisfies(meta.tier, s.requiredTier as PlanTierName))),
      });
      ws.send(payload);
    }
  }

  return { broadcastTick, broadcastStatus, broadcastSignalUpdates, clientCount: () => clients.size };
}
