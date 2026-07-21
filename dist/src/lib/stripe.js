"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("../config/env");
/**
 * Returns `null` when STRIPE_SECRET_KEY isn't configured, so the rest of the
 * app can run (and be tested) without real Stripe credentials. Billing
 * routes check for this and return a clear 503 instead of crashing.
 */
exports.stripe = env_1.env.STRIPE_SECRET_KEY
    ? new stripe_1.default(env_1.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
    : null;
//# sourceMappingURL=stripe.js.map