"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_TIER_RANK = void 0;
exports.tierSatisfies = tierSatisfies;
exports.PLAN_TIER_RANK = { FREE: 0, BASIC: 1, PREMIUM: 2, VIP: 3 };
/** True if a subscriber on `userTier` is entitled to content requiring `requiredTier`. */
function tierSatisfies(userTier, requiredTier) {
    return exports.PLAN_TIER_RANK[userTier] >= exports.PLAN_TIER_RANK[requiredTier];
}
//# sourceMappingURL=planTier.js.map