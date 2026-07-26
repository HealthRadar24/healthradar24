import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

const originalEnv = { ...process.env };

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  mock.restoreAll();
}

function stripeEnv(): void {
  process.env.PAYMENTS_ENABLED = 'true';
  process.env.BILLING_PROVIDER = 'stripe';
  process.env.BILLING_ENVIRONMENT = 'test_mode';
  process.env.STRIPE_SECRET_KEY = 'sk_test_healthradar';
  process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_healthradar_pro';
  process.env.CONVEX_SITE_URL = 'https://convex.example';
  process.env.RELAY_SHARED_SECRET = 'relay-secret';
}

afterEach(restoreEnv);

describe('HealthRadar Stripe Edge adapters', () => {
  it('creates a Stripe Checkout Session from an inherited product ID', async () => {
    stripeEnv();
    const mod = await import(`../api/create-checkout.ts?stripe=${Date.now()}-${Math.random()}`);
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    mod.__setCreateCheckoutDepsForTests({
      validateBearerToken: async () => ({
        valid: true,
        userId: 'user_stripe',
        email: 'buyer@example.test',
      }),
      fetch: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({
          url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        });
      },
    });

    const res = await mod.default(new Request(
      'https://www.healthradar24.com/api/create-checkout',
      {
        method: 'POST',
        headers: {
          Origin: 'https://www.healthradar24.com',
          Authorization: 'Bearer clerk-token',
          'Content-Type': 'application/json',
          'Idempotency-Key': 'checkout-attempt-1',
        },
        body: JSON.stringify({
          productId: 'pdt_0Nbtt71uObulf7fGXhQup',
          returnUrl: 'https://www.healthradar24.com/dashboard?wm_checkout=return',
        }),
      },
    ));

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      provider: 'stripe',
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'https://api.stripe.com/v1/checkout/sessions');
    const body = new URLSearchParams(String(calls[0]?.init?.body));
    assert.equal(body.get('line_items[0][price]'), 'price_healthradar_pro');
    assert.equal(body.get('subscription_data[metadata][user_id]'), 'user_stripe');
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>)['Idempotency-Key'],
      'checkout-attempt-1',
    );
  });

  it('resolves the Stripe customer in Convex before creating a portal session', async () => {
    stripeEnv();
    const mod = await import(`../api/customer-portal.ts?stripe=${Date.now()}-${Math.random()}`);
    const calls: string[] = [];
    mod.__setCustomerPortalDepsForTests({
      validateBearerToken: async () => ({
        valid: true,
        userId: 'user_stripe',
      }),
      fetch: async (url) => {
        calls.push(String(url));
        if (String(url).includes('/relay/billing-customer')) {
          return Response.json({ customerId: 'cus_healthradar' });
        }
        return Response.json({
          url: 'https://billing.stripe.com/p/session/test',
        });
      },
    });

    const res = await mod.default(new Request(
      'https://www.healthradar24.com/api/customer-portal',
      {
        method: 'POST',
        headers: {
          Origin: 'https://www.healthradar24.com',
          Authorization: 'Bearer clerk-token',
          'Idempotency-Key': 'portal-attempt-1',
        },
      },
    ));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      portal_url: 'https://billing.stripe.com/p/session/test',
      provider: 'stripe',
    });
    assert.deepEqual(calls, [
      'https://convex.example/relay/billing-customer',
      'https://api.stripe.com/v1/billing_portal/sessions',
    ]);
  });
});

