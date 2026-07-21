import Stripe from "stripe";
import { env } from "@/config/env";

/**
 * Returns `null` when STRIPE_SECRET_KEY isn't configured, so the rest of the
 * app can run (and be tested) without real Stripe credentials. Billing
 * routes check for this and return a clear 503 instead of crashing.
 */
export const stripe: Stripe | null = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;
