export const PLAN_TIER_RANK = { FREE: 0, BASIC: 1, PREMIUM: 2, VIP: 3 } as const;
export type PlanTierName = keyof typeof PLAN_TIER_RANK;

/** True if a subscriber on `userTier` is entitled to content requiring `requiredTier`. */
export function tierSatisfies(userTier: PlanTierName, requiredTier: PlanTierName): boolean {
  return PLAN_TIER_RANK[userTier] >= PLAN_TIER_RANK[requiredTier];
}
