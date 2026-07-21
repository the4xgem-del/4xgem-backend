"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = void 0;
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const CLOSED_STATUSES = ["HIT_TP1", "HIT_TP2", "HIT_TP3", "HIT_SL", "CLOSED"];
const WIN_STATUSES = ["HIT_TP1", "HIT_TP2", "HIT_TP3"];
exports.analyticsService = {
    /** Monthly pips + win rate for the last N months, computed from closed signals. */
    async performance(months = 7) {
        const cacheKey = `analytics:performance:${months}`;
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached)
            return cached;
        const since = new Date();
        since.setMonth(since.getMonth() - (months - 1));
        since.setDate(1);
        since.setHours(0, 0, 0, 0);
        const signals = await prisma_1.prisma.tradingSignal.findMany({
            where: { status: { in: [...CLOSED_STATUSES] }, updatedAt: { gte: since } },
            select: { status: true, pips: true, updatedAt: true },
        });
        const buckets = new Map();
        for (let i = 0; i < months; i++) {
            const d = new Date(since);
            d.setMonth(d.getMonth() + i);
            buckets.set(d.toLocaleString("en-US", { month: "short" }), { pips: 0, wins: 0, total: 0, monthDate: d });
        }
        for (const s of signals) {
            const key = s.updatedAt.toLocaleString("en-US", { month: "short" });
            const bucket = buckets.get(key);
            if (!bucket)
                continue;
            bucket.pips += s.pips;
            bucket.total += 1;
            if (WIN_STATUSES.includes(s.status))
                bucket.wins += 1;
        }
        const result = Array.from(buckets.entries()).map(([month, b]) => ({
            month,
            pips: b.pips,
            winRate: b.total > 0 ? Math.round((b.wins / b.total) * 100) : 0,
        }));
        await (0, redis_1.cacheSet)(cacheKey, result, 300);
        return result;
    },
    /** Signal distribution by instrument category, for the pie chart. */
    async categoryBreakdown() {
        const cacheKey = "analytics:category-breakdown";
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached)
            return cached;
        const grouped = await prisma_1.prisma.tradingSignal.groupBy({ by: ["category"], _count: { _all: true } });
        const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
        const COLORS = {
            FOREX: "#2563EB",
            GOLD: "#F5B301",
            CRYPTO: "#6D28D9",
            INDICES: "#10B981",
            COMMODITIES: "#D97706",
        };
        const result = grouped.map((g) => ({
            name: g.category,
            value: total > 0 ? Math.round((g._count._all / total) * 100) : 0,
            color: COLORS[g.category] ?? "#6B7280",
        }));
        await (0, redis_1.cacheSet)(cacheKey, result, 300);
        return result;
    },
    /** Admin-only high-level dashboard numbers. */
    async adminSummary() {
        const [totalUsers, activeSubs, totalSignals, openSignals, recentSignups] = await Promise.all([
            prisma_1.prisma.user.count({ where: { deletedAt: null } }),
            prisma_1.prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
            prisma_1.prisma.tradingSignal.count(),
            prisma_1.prisma.tradingSignal.count({ where: { status: { in: ["OPEN", "RUNNING"] } } }),
            prisma_1.prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, deletedAt: null } }),
        ]);
        const mrrCents = await prisma_1.prisma.subscription.findMany({
            where: { status: { in: ["ACTIVE", "TRIALING"] } },
            select: { plan: { select: { priceCents: true } } },
        });
        const mrr = mrrCents.reduce((sum, s) => sum + s.plan.priceCents, 0) / 100;
        return { totalUsers, activeSubscriptions: activeSubs, mrr, totalSignals, openSignals, newUsersLast30Days: recentSignups };
    },
};
//# sourceMappingURL=analytics.service.js.map