import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";

const CLOSED_STATUSES = ["HIT_TP1", "HIT_TP2", "HIT_TP3", "HIT_SL", "CLOSED"] as const;
const WIN_STATUSES = ["HIT_TP1", "HIT_TP2", "HIT_TP3"] as const;

export const analyticsService = {
  /** Monthly pips + win rate for the last N months, computed from closed signals. */
  async performance(months = 7) {
    const cacheKey = `analytics:performance:${months}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return cached;

    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const signals = await prisma.tradingSignal.findMany({
      where: { status: { in: [...CLOSED_STATUSES] }, updatedAt: { gte: since } },
      select: { status: true, pips: true, updatedAt: true },
    });

    const buckets = new Map<string, { pips: number; wins: number; total: number; monthDate: Date }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(d.getMonth() + i);
      buckets.set(d.toLocaleString("en-US", { month: "short" }), { pips: 0, wins: 0, total: 0, monthDate: d });
    }

    for (const s of signals) {
      const key = s.updatedAt.toLocaleString("en-US", { month: "short" });
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.pips += s.pips;
      bucket.total += 1;
      if (WIN_STATUSES.includes(s.status as (typeof WIN_STATUSES)[number])) bucket.wins += 1;
    }

    const result = Array.from(buckets.entries()).map(([month, b]) => ({
      month,
      pips: b.pips,
      winRate: b.total > 0 ? Math.round((b.wins / b.total) * 100) : 0,
    }));

    await cacheSet(cacheKey, result, 300);
    return result;
  },

  /** Signal distribution by instrument category, for the pie chart. */
  async categoryBreakdown() {
    const cacheKey = "analytics:category-breakdown";
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return cached;

    const grouped = await prisma.tradingSignal.groupBy({ by: ["category"], _count: { _all: true } });
    const total = grouped.reduce((sum: number, g: (typeof grouped)[number]) => sum + g._count._all, 0);

    const COLORS: Record<string, string> = {
      FOREX: "#2563EB",
      GOLD: "#F5B301",
      CRYPTO: "#6D28D9",
      INDICES: "#10B981",
      COMMODITIES: "#D97706",
    };

    const result = grouped.map((g: (typeof grouped)[number]) => ({
      name: g.category,
      value: total > 0 ? Math.round((g._count._all / total) * 100) : 0,
      color: COLORS[g.category] ?? "#6B7280",
    }));

    await cacheSet(cacheKey, result, 300);
    return result;
  },

  /** Admin-only high-level dashboard numbers. */
  async adminSummary() {
    const [totalUsers, activeSubs, totalSignals, openSignals, recentSignups] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
      prisma.tradingSignal.count(),
      prisma.tradingSignal.count({ where: { status: { in: ["OPEN", "RUNNING"] } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, deletedAt: null } }),
    ]);

    const mrrCents = await prisma.subscription.findMany({
      where: { status: { in: ["ACTIVE", "TRIALING"] } },
      select: { plan: { select: { priceCents: true } } },
    });
    const mrr = mrrCents.reduce((sum: number, s: (typeof mrrCents)[number]) => sum + s.plan.priceCents, 0) / 100;

    return { totalUsers, activeSubscriptions: activeSubs, mrr, totalSignals, openSignals, newUsersLast30Days: recentSignups };
  },
};
