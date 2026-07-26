/**
 * Provider-neutral billing projection for the HealthRadar24 fork.
 *
 * This module is additive: upstream Dodo tables and handlers remain the
 * compatibility authority for Dodo. Stripe writes only the new billing*
 * tables and provider-owned entitlement metadata.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import {
  FREE_FEATURES,
  getFeaturesForPlan,
} from "../lib/entitlements";
import { PLAN_PRECEDENCE } from "../config/productCatalog";

const providerValidator = v.union(v.literal("dodo"), v.literal("stripe"));
const statusValidator = v.union(
  v.literal("active"),
  v.literal("on_hold"),
  v.literal("cancelled"),
  v.literal("expired"),
);

async function providerLock(ctx: MutationCtx, provider: "dodo" | "stripe") {
  const lock = await ctx.db
    .query("billingProviderLocks")
    .withIndex("by_provider", (q) => q.eq("provider", provider))
    .first();
  if (!lock) {
    throw new Error(
      `Billing provider lock for ${provider} is not seeded; run payments/providerBilling:seedProviderLocks`,
    );
  }
  return lock;
}

export const seedProviderLocks = internalMutation({
  args: {},
  handler: async (ctx) => {
    let seeded = 0;
    for (const provider of ["dodo", "stripe"] as const) {
      const existing = await ctx.db
        .query("billingProviderLocks")
        .withIndex("by_provider", (q) => q.eq("provider", provider))
        .first();
      if (!existing) {
        await ctx.db.insert("billingProviderLocks", {
          provider,
          lastEventAt: 0,
        });
        seeded += 1;
      }
    }
    return { seeded };
  },
});

async function upsertCustomer(
  ctx: MutationCtx,
  args: {
    userId: string;
    provider: "dodo" | "stripe";
    customerId: string;
    email?: string;
    now: number;
  },
) {
  const byProviderId = await ctx.db
    .query("billingCustomers")
    .withIndex("by_provider_customer", (q) =>
      q.eq("provider", args.provider).eq("providerCustomerId", args.customerId)
    )
    .first();
  const byUser = await ctx.db
    .query("billingCustomers")
    .withIndex("by_user_provider", (q) =>
      q.eq("userId", args.userId).eq("provider", args.provider)
    )
    .first();
  const existing = byProviderId ?? byUser;
  if (existing) {
    await ctx.db.patch(existing._id, {
      userId: args.userId,
      providerCustomerId: args.customerId,
      ...(args.email ? { email: args.email } : {}),
      updatedAt: args.now,
    });
    return existing._id;
  }
  return ctx.db.insert("billingCustomers", {
    userId: args.userId,
    provider: args.provider,
    providerCustomerId: args.customerId,
    ...(args.email ? { email: args.email } : {}),
    createdAt: args.now,
    updatedAt: args.now,
  });
}

function strongerPlan<T extends { planKey: string; currentPeriodEnd: number }>(
  left: T,
  right: T,
): T {
  const leftFeatures = getFeaturesForPlan(left.planKey);
  const rightFeatures = getFeaturesForPlan(right.planKey);
  if (leftFeatures.tier !== rightFeatures.tier) {
    return leftFeatures.tier > rightFeatures.tier ? left : right;
  }
  const leftPrecedence = PLAN_PRECEDENCE[left.planKey] ?? 0;
  const rightPrecedence = PLAN_PRECEDENCE[right.planKey] ?? 0;
  if (leftPrecedence !== rightPrecedence) {
    return leftPrecedence > rightPrecedence ? left : right;
  }
  return left.currentPeriodEnd >= right.currentPeriodEnd ? left : right;
}

async function syncStripeEntitlement(ctx: MutationCtx, userId: string, now: number) {
  const active = await ctx.db
    .query("billingSubscriptions")
    .withIndex("by_user_provider", (q) =>
      q.eq("userId", userId).eq("provider", "stripe")
    )
    .filter((q) =>
      q.and(
        q.eq(q.field("status"), "active"),
        q.gt(q.field("currentPeriodEnd"), now),
      )
    )
    .collect();
  const entitlement = await ctx.db
    .query("entitlements")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (active.length === 0) {
    if (entitlement?.billingProvider !== "stripe") return null;
    const next = {
      planKey: "free",
      features: FREE_FEATURES,
      validUntil: now,
      billingProvider: "stripe" as const,
      providerSubscriptionId: undefined,
      updatedAt: now,
    };
    await ctx.db.patch(entitlement._id, next);
    return next;
  }

  const strongest = active.reduce((best, candidate) =>
    strongerPlan(best, candidate)
  );
  const features = getFeaturesForPlan(strongest.planKey);

  // Never let a weaker Stripe event overwrite a stronger legacy/manual grant.
  if (
    entitlement &&
    entitlement.billingProvider !== "stripe" &&
    entitlement.validUntil > now &&
    entitlement.features.tier > features.tier
  ) {
    return null;
  }

  const next = {
    planKey: strongest.planKey,
    features,
    validUntil: strongest.currentPeriodEnd,
    billingProvider: "stripe" as const,
    providerSubscriptionId: strongest.providerSubscriptionId,
    updatedAt: now,
  };
  if (entitlement) {
    await ctx.db.patch(entitlement._id, next);
  } else {
    await ctx.db.insert("entitlements", { userId, ...next });
  }
  return next;
}

export const applyBillingEvent = internalMutation({
  args: {
    provider: providerValidator,
    eventId: v.string(),
    eventType: v.string(),
    createdAt: v.number(),
    kind: v.union(v.literal("customer_link"), v.literal("subscription")),
    userId: v.optional(v.string()),
    customerId: v.string(),
    email: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    priceId: v.optional(v.string()),
    planKey: v.optional(v.string()),
    status: v.optional(statusValidator),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.provider !== "stripe") {
      throw new Error("Provider-neutral ingress currently accepts Stripe only");
    }
    if (!args.eventId || args.eventId.length > 255) {
      throw new Error("Invalid provider event ID");
    }
    const lock = await providerLock(ctx, args.provider);
    const duplicate = await ctx.db
      .query("billingWebhookEvents")
      .withIndex("by_provider_event", (q) =>
        q.eq("provider", args.provider).eq("providerEventId", args.eventId)
      )
      .first();
    if (duplicate) return { duplicate: true };

    let userId = args.userId;
    if (!userId) {
      const customer = await ctx.db
        .query("billingCustomers")
        .withIndex("by_provider_customer", (q) =>
          q.eq("provider", args.provider)
            .eq("providerCustomerId", args.customerId)
        )
        .first();
      userId = customer?.userId;
    }
    if (!userId || userId.length > 256) {
      throw new Error("Stripe event cannot be linked to a valid user");
    }

    const now = Date.now();
    await upsertCustomer(ctx, {
      userId,
      provider: args.provider,
      customerId: args.customerId,
      email: args.email,
      now,
    });

    let entitlementUpdate: Awaited<ReturnType<typeof syncStripeEntitlement>> = null;
    if (args.kind === "subscription") {
      if (
        !args.subscriptionId ||
        !args.planKey ||
        !args.status ||
        args.currentPeriodStart == null ||
        args.currentPeriodEnd == null
      ) {
        throw new Error("Incomplete Stripe subscription event");
      }
      // Throws for an unrecognized plan before any entitlement grant.
      getFeaturesForPlan(args.planKey);
      const existing = await ctx.db
        .query("billingSubscriptions")
        .withIndex("by_provider_subscription", (q) =>
          q.eq("provider", args.provider)
            .eq("providerSubscriptionId", args.subscriptionId!)
        )
        .first();
      const next = {
        userId,
        providerCustomerId: args.customerId,
        providerPriceId: args.priceId,
        planKey: args.planKey,
        status: args.status,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        eventCreatedAt: args.createdAt,
        updatedAt: now,
      };
      if (!existing) {
        await ctx.db.insert("billingSubscriptions", {
          provider: args.provider,
          providerSubscriptionId: args.subscriptionId,
          ...next,
        });
      } else if (args.createdAt >= existing.eventCreatedAt) {
        await ctx.db.patch(existing._id, next);
      }
      entitlementUpdate = await syncStripeEntitlement(ctx, userId, now);
    }

    await ctx.db.insert("billingWebhookEvents", {
      provider: args.provider,
      providerEventId: args.eventId,
      eventType: args.eventType,
      eventCreatedAt: args.createdAt,
      processedAt: now,
    });
    await ctx.db.patch(lock._id, { lastEventAt: now });

    if (entitlementUpdate && process.env.UPSTASH_REDIS_REST_URL) {
      await ctx.scheduler.runAfter(
        0,
        internal.payments.cacheActions.syncEntitlementCache,
        {
          userId,
          planKey: entitlementUpdate.planKey,
          features: entitlementUpdate.features,
          validUntil: entitlementUpdate.validUntil,
        },
      );
    }
    return {
      duplicate: false,
      kind: args.kind,
      entitlementUpdated: entitlementUpdate !== null,
    };
  },
});

export const getBillingCustomer = internalQuery({
  args: {
    userId: v.string(),
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("billingCustomers")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();
    return customer
      ? { customerId: customer.providerCustomerId }
      : null;
  },
});
