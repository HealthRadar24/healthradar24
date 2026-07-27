/**
 * Fork-owned billing provider boundary.
 *
 * The browser may continue sending inherited Dodo product IDs so upstream
 * pricing components stay syncable. This adapter resolves them to stable plan
 * keys before selecting a provider-specific price.
 */

import { PRODUCT_CATALOG } from './_product-catalog.generated.js';

const STRIPE_PRICE_ENV_BY_PLAN = Object.freeze({
  pro_monthly: 'STRIPE_PRICE_PRO_MONTHLY',
  pro_annual: 'STRIPE_PRICE_PRO_ANNUAL',
  pro_business_monthly: 'STRIPE_PRICE_PRO_BUSINESS_MONTHLY',
  pro_business_annual: 'STRIPE_PRICE_PRO_BUSINESS_ANNUAL',
  api_starter: 'STRIPE_PRICE_API_STARTER_MONTHLY',
  api_starter_annual: 'STRIPE_PRICE_API_STARTER_ANNUAL',
  api_business: 'STRIPE_PRICE_API_BUSINESS_MONTHLY',
});

const SUPPORTED_PLAN_KEYS = new Set(Object.keys(STRIPE_PRICE_ENV_BY_PLAN));

export function billingProvider(env = process.env) {
  const value = (env.BILLING_PROVIDER ?? 'dodo').trim().toLowerCase();
  return value === 'stripe' ? 'stripe' : 'dodo';
}

export function billingEnvironment(env = process.env) {
  return (env.BILLING_ENVIRONMENT ?? env.DODO_PAYMENTS_ENVIRONMENT) === 'live_mode'
    ? 'live_mode'
    : 'test_mode';
}

export function resolvePlanKey(productIdOrPlanKey) {
  if (typeof productIdOrPlanKey !== 'string') return null;
  if (SUPPORTED_PLAN_KEYS.has(productIdOrPlanKey)) return productIdOrPlanKey;
  const generated = PRODUCT_CATALOG[productIdOrPlanKey];
  return generated?.planKey && SUPPORTED_PLAN_KEYS.has(generated.planKey)
    ? generated.planKey
    : null;
}

export function stripePriceForPlan(planKey, env = process.env) {
  const envName = STRIPE_PRICE_ENV_BY_PLAN[planKey];
  if (!envName) return null;
  const value = env[envName];
  return typeof value === 'string' && value.startsWith('price_') ? value : null;
}

export function stripePlanForPrice(priceId, env = process.env) {
  if (typeof priceId !== 'string') return null;
  for (const [planKey, envName] of Object.entries(STRIPE_PRICE_ENV_BY_PLAN)) {
    if (env[envName] === priceId) return planKey;
  }
  return null;
}

export function assertStripeTestMode(env = process.env) {
  const secret = env.STRIPE_SECRET_KEY ?? '';
  const environment = billingEnvironment(env);
  if (!secret) {
    return { ok: false, error: 'STRIPE_SECRET_KEY_MISSING' };
  }
  if (environment === 'test_mode' && !secret.startsWith('sk_test_')) {
    return { ok: false, error: 'STRIPE_TEST_KEY_REQUIRED' };
  }
  if (
    environment === 'live_mode' &&
    (!secret.startsWith('sk_live_') || env.STRIPE_LIVE_MODE_APPROVED !== 'true')
  ) {
    return { ok: false, error: 'STRIPE_LIVE_MODE_NOT_APPROVED' };
  }
  return { ok: true, secret, environment };
}

export function trustedCheckoutReturnUrl(candidate, env = process.env) {
  const fallback = 'https://www.healthradar24.com/dashboard?wm_checkout=return';
  if (!candidate) return fallback;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  const allowed = new Set([
    'https://healthradar24.com',
    'https://www.healthradar24.com',
  ]);
  if (env.VERCEL_URL) allowed.add(`https://${env.VERCEL_URL}`);
  if (!allowed.has(parsed.origin)) return null;
  return parsed.toString();
}

export function stripeCheckoutBody({
  priceId,
  planKey,
  userId,
  email,
  returnUrl,
}) {
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', returnUrl);
  params.set('cancel_url', returnUrl);
  params.set('client_reference_id', userId);
  params.set('metadata[user_id]', userId);
  params.set('metadata[plan_key]', planKey);
  params.set('subscription_data[metadata][user_id]', userId);
  params.set('subscription_data[metadata][plan_key]', planKey);
  params.set('allow_promotion_codes', 'true');
  if (email) params.set('customer_email', email);
  return params;
}
