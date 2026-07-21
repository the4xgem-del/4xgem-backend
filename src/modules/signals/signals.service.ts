import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { tierSatisfies, type PlanTierName } from "@/utils/planTier";
import { ApiError } from "@/utils/ApiError";
import { computeFloatingPips } from "@/lib/marketData";
import type { ListSignalsQuery, CreateSignalInput } from "./signals.schema";

export async function getUserActiveTier(userId?: string): Promise<PlanTierName> {
  if (!userId) return "FREE";
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  return (sub?.plan.tier as PlanTierName) ?? "FREE";
}

// Serialization mirrors the frontend's existing display shape so the UI
// layer (which was built against hardcoded mock objects) can consume real
// data through the same field names it already expects. Exported so the
// WebSocket broadcaster can apply the exact same tier-masking as the REST API.
export function serializeSignal(signal: Awaited<ReturnType<typeof prisma.tradingSignal.findFirstOrThrow>>, unlocked: boolean) {
  const base = {
    id: signal.id,
    pair: signal.pair,
    name: signal.name,
    category: signal.category,
    status: signal.status,
    confidence: signal.confidence,
    pips: signal.pips,
    requiredTier: signal.requiredTier,
    createdAt: signal.createdAt,
    locked: !unlocked,
  };
  if (!unlocked) return base;
  return {
    ...base,
    direction: signal.direction,
    entry: signal.entry.toString(),
    stopLoss: signal.stopLoss.toString(),
    takeProfit1: signal.takeProfit1.toString(),
    takeProfit2: signal.takeProfit2?.toString() ?? null,
    takeProfit3: signal.takeProfit3?.toString() ?? null,
    riskPercent: signal.riskPercent.toString(),
  };
}

export const signalsService = {
  async list(query: ListSignalsQuery, userId?: string) {
    const cacheKey = `signals:list:${JSON.stringify(query)}`;
    const cached = await cacheGet<unknown>(cacheKey);

    const userTier = await getUserActiveTier(userId);
    const orderBy =
      query.sort === "confidence"
        ? [{ confidence: "desc" as const }]
        : [{ createdAt: query.sort === "oldest" ? ("asc" as const) : ("desc" as const) }];

    let signals;
    if (cached) {
      signals = cached as Awaited<ReturnType<typeof prisma.tradingSignal.findMany>>;
    } else {
      signals = await prisma.tradingSignal.findMany({
        where: {
          ...(query.category ? { category: query.category } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      await cacheSet(cacheKey, signals, 30); // short TTL — signals update frequently
    }

    const total = await prisma.tradingSignal.count({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
    });

    return {
      items: signals.map((s: (typeof signals)[number]) => serializeSignal(s, tierSatisfies(userTier, s.requiredTier as PlanTierName))),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  },

  async getById(id: string, userId?: string) {
    const signal = await prisma.tradingSignal.findUnique({ where: { id } });
    if (!signal) throw ApiError.notFound("Signal not found.");
    const userTier = await getUserActiveTier(userId);
    return serializeSignal(signal, tierSatisfies(userTier, signal.requiredTier as PlanTierName));
  },

  async create(authorId: string, input: CreateSignalInput) {
    const signal = await prisma.tradingSignal.create({
      data: { ...input, authorId },
    });
    return serializeSignal(signal, true);
  },

  /**
   * Called by the live-price signal watcher on every tick. Finds
   * OPEN/RUNNING signals for the ticked pair, checks whether the new
   * price crossed the stop-loss or any take-profit level, and updates
   * status accordingly. Returns the signals that actually changed, so the
   * caller can broadcast just those over the WebSocket.
   */
  async applyPriceUpdate(displayPair: string, currentPrice: number) {
    const candidates = await prisma.tradingSignal.findMany({
      where: { pair: displayPair, status: { in: ["OPEN", "RUNNING"] } },
    });
    if (candidates.length === 0) return [];

    const updated: Awaited<ReturnType<typeof prisma.tradingSignal.update>>[] = [];

    for (const signal of candidates) {
      const isLong = signal.direction === "BUY" || signal.direction === "BUY_LIMIT";
      const entry = Number(signal.entry);
      const sl = Number(signal.stopLoss);
      const tp1 = Number(signal.takeProfit1);
      const tp2 = signal.takeProfit2 ? Number(signal.takeProfit2) : null;
      const tp3 = signal.takeProfit3 ? Number(signal.takeProfit3) : null;

      let nextStatus: typeof signal.status | null = null;

      const hit = (level: number) => (isLong ? currentPrice >= level : currentPrice <= level);
      const stopped = isLong ? currentPrice <= sl : currentPrice >= sl;

      if (stopped) nextStatus = "HIT_SL";
      else if (tp3 && hit(tp3)) nextStatus = "HIT_TP3";
      else if (tp2 && hit(tp2)) nextStatus = "HIT_TP2";
      else if (hit(tp1)) nextStatus = "HIT_TP1";
      else if (signal.status === "OPEN" && ((isLong && currentPrice >= entry) || (!isLong && currentPrice <= entry))) {
        // Price reached the entry level — the trade is now considered live.
        nextStatus = "RUNNING";
      }

      if (nextStatus && nextStatus !== signal.status) {
        const pipsMoved = computeFloatingPips(signal.pair, signal.direction, entry, currentPrice) ?? 0;
        const isFinal = nextStatus === "HIT_SL" || nextStatus === "HIT_TP3";
        const result = await prisma.tradingSignal.update({
          where: { id: signal.id },
          data: {
            status: nextStatus,
            pips: Math.round(pipsMoved),
            closedAt: isFinal ? new Date() : signal.closedAt,
          },
        });
        updated.push(result);
      }
    }

    return updated;
  },
};
