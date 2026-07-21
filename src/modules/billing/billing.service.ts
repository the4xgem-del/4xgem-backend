import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";
import { logger } from "@/utils/logger";
import { notificationsService } from "@/modules/notifications/notifications.service";
import type { SubscriptionStatus } from "@prisma/client";

function requireStripe(): Stripe {
  if (!stripe) {
    throw new ApiError(503, "BILLING_NOT_CONFIGURED", "Billing isn't configured yet — set STRIPE_SECRET_KEY.");
  }
  return stripe;
}

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "EXPIRED",
  unpaid: "PAST_DUE",
  paused: "CANCELED",
};

async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const client = requireStripe();
  const existing = await prisma.subscription.findFirst({
    where: { userId, stripeCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const customer = await client.customers.create({
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
    metadata: { userId },
  });
  return customer.id;
}

export const billingService = {
  async createCheckoutSession(userId: string, planId: string) {
    const client = requireStripe();
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw ApiError.notFound("Plan not found.");
    if (!plan.stripePriceId) {
      throw ApiError.badRequest("This plan isn't connected to a Stripe price yet.");
    }

    const customerId = await getOrCreateStripeCustomer(userId);

    const session = await client.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${env.WEB_APP_URL}/dashboard/subscription?checkout=success`,
      cancel_url: `${env.WEB_APP_URL}/dashboard/subscription?checkout=canceled`,
      metadata: { userId, planId },
      subscription_data: { metadata: { userId, planId } },
    });

    if (!session.url) throw ApiError.internal("Stripe did not return a checkout URL.");
    return { url: session.url };
  },

  async createPortalSession(userId: string) {
    const client = requireStripe();
    const sub = await prisma.subscription.findFirst({
      where: { userId, stripeCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (!sub?.stripeCustomerId) {
      throw ApiError.badRequest("No billing account found yet — subscribe to a plan first.");
    }
    const portal = await client.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${env.WEB_APP_URL}/dashboard/subscription`,
    });
    return { url: portal.url };
  },

  /**
   * Verifies the Stripe signature against the RAW request body (must be
   * mounted before express.json() in app.ts) and dispatches known events.
   */
  async handleWebhook(rawBody: Buffer, signature: string) {
    const client = requireStripe();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new ApiError(503, "BILLING_NOT_CONFIGURED", "STRIPE_WEBHOOK_SECRET isn't set.");
    }

    let event: Stripe.Event;
    try {
      event = client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.warn({ err }, "Stripe webhook signature verification failed");
      throw ApiError.badRequest("Invalid Stripe signature.");
    }

    switch (event.type) {
      case "checkout.session.completed":
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await this.onSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await this.onInvoiceEvent(event.type, event.data.object as Stripe.Invoice);
        break;
      default:
        logger.info({ type: event.type }, "Unhandled Stripe webhook event type");
    }
  },

  async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const client = requireStripe();
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    if (!userId || !planId || !session.subscription) return;

    const stripeSub = await client.subscriptions.retrieve(session.subscription as string);

    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: stripeSub.id },
      update: {
        status: STRIPE_STATUS_MAP[stripeSub.status] ?? "ACTIVE",
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      },
      create: {
        userId,
        planId,
        status: STRIPE_STATUS_MAP[stripeSub.status] ?? "ACTIVE",
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        stripeSubscriptionId: stripeSub.id,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      },
    });

    await notificationsService.notify(userId, "BILLING", "Subscription activated", "Your subscription is now active — welcome aboard!");
  },

  async onSubscriptionChanged(stripeSub: Stripe.Subscription) {
    const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSub.id } });
    if (!existing) return;

    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: STRIPE_STATUS_MAP[stripeSub.status] ?? existing.status,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
    });

    if (stripeSub.status === "past_due") {
      await notificationsService.notify(
        existing.userId,
        "BILLING",
        "Payment issue",
        "We couldn't process your last payment — please update your billing details.",
      );
    }
  },

  async onInvoiceEvent(type: string, invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId }, orderBy: { createdAt: "desc" } });
    if (!sub) return;

    await prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amountCents: invoice.amount_paid || invoice.amount_due,
        currency: invoice.currency,
        status: type === "invoice.payment_succeeded" ? "SUCCEEDED" : "FAILED",
        stripePaymentIntentId: typeof invoice.payment_intent === "string" ? invoice.payment_intent : undefined,
        invoiceUrl: invoice.hosted_invoice_url ?? undefined,
      },
    });
  },
};
