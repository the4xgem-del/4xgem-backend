"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachMarketWebSocketServer = attachMarketWebSocketServer;
const ws_1 = require("ws");
const jwt_1 = require("../utils/jwt");
const signals_service_1 = require("../modules/signals/signals.service");
const planTier_1 = require("../utils/planTier");
const logger_1 = require("../utils/logger");
const marketData_1 = require("../lib/marketData");
const WS_PATH = "/ws/market";
const HEARTBEAT_INTERVAL_MS = 30_000;
function parseCookie(header, name) {
    if (!header)
        return undefined;
    const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}
async function resolveTierFromRequest(cookieHeader) {
    const token = parseCookie(cookieHeader, "access_token");
    if (!token)
        return "FREE";
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        return (0, signals_service_1.getUserActiveTier)(payload.sub);
    }
    catch {
        return "FREE";
    }
}
function attachMarketWebSocketServer(httpServer) {
    const wss = new ws_1.WebSocketServer({ noServer: true });
    const clients = new Map();
    httpServer.on("upgrade", (req, socket, head) => {
        if (req.url?.split("?")[0] !== WS_PATH)
            return; // let other upgrade handlers (if any) deal with it
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
        });
    });
    wss.on("connection", async (ws, req) => {
        const tier = await resolveTierFromRequest(req.headers.cookie);
        clients.set(ws, { tier, isAlive: true });
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "provider_status", data: (0, marketData_1.getMarketDataHealth)() }));
        }
        ws.on("pong", () => {
            const meta = clients.get(ws);
            if (meta)
                meta.isAlive = true;
        });
        ws.on("close", () => clients.delete(ws));
        ws.on("error", (err) => logger_1.logger.warn({ err }, "Market WS client error"));
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
    function broadcastTick(tick) {
        const payload = JSON.stringify({ type: "tick", data: tick });
        for (const ws of clients.keys()) {
            if (ws.readyState === ws_1.WebSocket.OPEN)
                ws.send(payload);
        }
    }
    function broadcastStatus(health) {
        const payload = JSON.stringify({ type: "provider_status", data: health });
        for (const ws of clients.keys()) {
            if (ws.readyState === ws_1.WebSocket.OPEN)
                ws.send(payload);
        }
    }
    function broadcastSignalUpdates(signals) {
        if (signals.length === 0 || clients.size === 0)
            return;
        for (const [ws, meta] of clients) {
            if (ws.readyState !== ws_1.WebSocket.OPEN)
                continue;
            const payload = JSON.stringify({
                type: "signal_update",
                data: signals.map((s) => (0, signals_service_1.serializeSignal)(s, (0, planTier_1.tierSatisfies)(meta.tier, s.requiredTier))),
            });
            ws.send(payload);
        }
    }
    return { broadcastTick, broadcastStatus, broadcastSignalUpdates, clientCount: () => clients.size };
}
//# sourceMappingURL=server.js.map