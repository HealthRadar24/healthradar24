import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertStripeTestMode,
  billingProvider,
  resolvePlanKey,
  stripeCheckoutBody,
  stripePlanForPrice,
  stripePriceForPlan,
  trustedCheckoutReturnUrl,
} from '../api/_billing-provider.js';
import {
  normalizeStripeEvent,
  verifyStripeSignature,
} from '../api/_stripe-webhook.js';

describe('HealthRadar provider-neutral billing adapter', () => {
  it('preserves inherited product IDs while resolving a Stripe plan', () => {
    const env = { STRIPE_PRICE_PRO_MONTHLY: 'price_healthradar_pro' };
    assert.equal(billingProvider({ BILLING_PROVIDER: 'stripe' }), 'stripe');
    assert.equal(resolvePlanKey('pdt_0Nbtt71uObulf7fGXhQup'), 'pro_monthly');
    assert.equal(resolvePlanKey('pro_monthly'), 'pro_monthly');
    assert.equal(stripePriceForPlan('pro_monthly', env), 'price_healthradar_pro');
    assert.equal(stripePlanForPrice('price_healthradar_pro', env), 'pro_monthly');
  });

  it('fails closed on key/environment mismatches and unapproved live mode', () => {
    assert.deepEqual(
      assertStripeTestMode({
        BILLING_ENVIRONMENT: 'test_mode',
        STRIPE_SECRET_KEY: 'sk_live_wrong',
      }),
      { ok: false, error: 'STRIPE_TEST_KEY_REQUIRED' },
    );
    assert.deepEqual(
      assertStripeTestMode({
        BILLING_ENVIRONMENT: 'live_mode',
        STRIPE_SECRET_KEY: 'sk_live_example',
      }),
      { ok: false, error: 'STRIPE_LIVE_MODE_NOT_APPROVED' },
    );
    assert.equal(
      assertStripeTestMode({
        BILLING_ENVIRONMENT: 'test_mode',
        STRIPE_SECRET_KEY: 'sk_test_example',
      }).ok,
      true,
    );
  });

  it('allows only fork-owned or exact Vercel checkout return origins', () => {
    assert.equal(
      trustedCheckoutReturnUrl('https://www.healthradar24.com/dashboard'),
      'https://www.healthradar24.com/dashboard',
    );
    assert.equal(
      trustedCheckoutReturnUrl('https://preview.example.vercel.app/return', {
        VERCEL_URL: 'preview.example.vercel.app',
      }),
      'https://preview.example.vercel.app/return',
    );
    assert.equal(trustedCheckoutReturnUrl('https://attacker.example/return'), null);
  });

  it('builds Stripe subscription checkout metadata without secrets', () => {
    const body = stripeCheckoutBody({
      priceId: 'price_123',
      planKey: 'pro_monthly',
      userId: 'user_123',
      email: 'person@example.test',
      returnUrl: 'https://www.healthradar24.com/dashboard?wm_checkout=return',
    });
    assert.equal(body.get('mode'), 'subscription');
    assert.equal(body.get('line_items[0][price]'), 'price_123');
    assert.equal(body.get('metadata[user_id]'), 'user_123');
    assert.equal(body.get('subscription_data[metadata][plan_key]'), 'pro_monthly');
  });
});

describe('Stripe webhook normalization and verification', () => {
  it('verifies a valid signed body and rejects stale signatures', async () => {
    const payload = '{"id":"evt_test"}';
    const secret = 'whsec_test_secret';
    const timestamp = 1_700_000_000;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const digest = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${timestamp}.${payload}`),
    );
    const signature = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const header = `t=${timestamp},v1=${signature}`;
    assert.equal(await verifyStripeSignature({
      payload,
      signatureHeader: header,
      secret,
      nowSeconds: timestamp,
    }), true);
    assert.equal(await verifyStripeSignature({
      payload,
      signatureHeader: header,
      secret,
      nowSeconds: timestamp + 301,
    }), false);
  });

  it('normalizes signed subscription state to a stable internal contract', () => {
    const normalized = normalizeStripeEvent({
      id: 'evt_subscription',
      type: 'customer.subscription.updated',
      created: 1_700_000_000,
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
          metadata: { user_id: 'user_123', plan_key: 'pro_monthly' },
          items: { data: [{ price: { id: 'price_123' } }] },
        },
      },
    });
    assert.deepEqual(normalized, {
      eventId: 'evt_subscription',
      eventType: 'customer.subscription.updated',
      createdAt: 1_700_000_000_000,
      kind: 'subscription',
      userId: 'user_123',
      customerId: 'cus_123',
      subscriptionId: 'sub_123',
      priceId: 'price_123',
      planKey: 'pro_monthly',
      status: 'active',
      currentPeriodStart: 1_700_000_000_000,
      currentPeriodEnd: 1_702_592_000_000,
    });
  });
});

