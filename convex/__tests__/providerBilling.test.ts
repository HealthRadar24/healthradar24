import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

const seedLocks = makeFunctionReference<"mutation">(
  "payments/providerBilling:seedProviderLocks",
);
const applyEvent = makeFunctionReference<"mutation">(
  "payments/providerBilling:applyBillingEvent",
);

describe("provider-neutral Stripe billing projection", () => {
  test("grants, deduplicates, and revokes only Stripe-owned entitlements", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    const t = convexTest(schema, modules);
    await t.mutation(seedLocks, {});
    const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const active = {
      provider: "stripe" as const,
      eventId: "evt_active",
      eventType: "customer.subscription.updated",
      createdAt: Date.now(),
      kind: "subscription" as const,
      userId: "user_stripe",
      customerId: "cus_stripe",
      subscriptionId: "sub_stripe",
      priceId: "price_pro",
      planKey: "pro_monthly",
      status: "active" as const,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: future,
    };
    const first = await t.mutation(applyEvent, active);
    expect(first).toMatchObject({ duplicate: false, entitlementUpdated: true });
    expect(await t.mutation(applyEvent, active)).toEqual({ duplicate: true });

    let entitlement = await t.run((ctx) =>
      ctx.db.query("entitlements")
        .withIndex("by_userId", (q) => q.eq("userId", "user_stripe"))
        .first()
    );
    expect(entitlement).toMatchObject({
      planKey: "pro_monthly",
      billingProvider: "stripe",
      providerSubscriptionId: "sub_stripe",
      validUntil: future,
    });

    await t.mutation(applyEvent, {
      ...active,
      eventId: "evt_cancelled",
      eventType: "customer.subscription.deleted",
      createdAt: active.createdAt + 1,
      userId: undefined,
      status: "cancelled",
    });
    entitlement = await t.run((ctx) =>
      ctx.db.query("entitlements")
        .withIndex("by_userId", (q) => q.eq("userId", "user_stripe"))
        .first()
    );
    expect(entitlement).toMatchObject({
      planKey: "free",
      billingProvider: "stripe",
    });
  });

  test("does not let a weaker Stripe plan overwrite a stronger manual grant", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    const t = convexTest(schema, modules);
    await t.mutation(seedLocks, {});
    const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await t.run((ctx) => ctx.db.insert("entitlements", {
      userId: "user_manual",
      planKey: "api_business",
      features: {
        tier: 2,
        maxDashboards: 100,
        apiAccess: true,
        apiRateLimit: 300,
        prioritySupport: true,
        exportFormats: ["csv", "pdf", "json"],
      },
      validUntil: future,
      billingProvider: "manual",
      updatedAt: Date.now(),
    }));

    await t.mutation(applyEvent, {
      provider: "stripe",
      eventId: "evt_weaker",
      eventType: "customer.subscription.created",
      createdAt: Date.now(),
      kind: "subscription",
      userId: "user_manual",
      customerId: "cus_manual",
      subscriptionId: "sub_weaker",
      planKey: "pro_monthly",
      status: "active",
      currentPeriodStart: Date.now(),
      currentPeriodEnd: future,
    });

    const entitlement = await t.run((ctx) =>
      ctx.db.query("entitlements")
        .withIndex("by_userId", (q) => q.eq("userId", "user_manual"))
        .first()
    );
    expect(entitlement).toMatchObject({
      planKey: "api_business",
      billingProvider: "manual",
    });
  });
});

