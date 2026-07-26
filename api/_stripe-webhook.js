import { stripePlanForPrice } from './_billing-provider.js';

const encoder = new TextEncoder();

function hex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let different = 0;
  for (let index = 0; index < a.length; index += 1) {
    different |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return different === 0;
}

export function parseStripeSignatureHeader(header) {
  const values = { signatures: [] };
  for (const part of (header ?? '').split(',')) {
    const [key, value] = part.split('=', 2);
    if (key === 't' && /^\d+$/.test(value ?? '')) values.timestamp = Number(value);
    if (key === 'v1' && value) values.signatures.push(value);
  }
  return values;
}

export async function verifyStripeSignature({
  payload,
  signatureHeader,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
}) {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.timestamp || parsed.signatures.length === 0 || !secret) return false;
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${parsed.timestamp}.${payload}`),
  );
  const expected = hex(digest);
  return parsed.signatures.some((candidate) => constantTimeEqual(candidate, expected));
}

function stringValue(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function stripeSubscriptionStatus(status) {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid' || status === 'paused') return 'on_hold';
  if (status === 'canceled') return 'cancelled';
  if (status === 'incomplete_expired') return 'expired';
  return null;
}

export function normalizeStripeEvent(event, env = process.env) {
  if (!event || typeof event !== 'object' || typeof event.id !== 'string') return null;
  const object = event.data?.object;
  if (!object || typeof object !== 'object') return null;
  const base = {
    eventId: event.id,
    eventType: typeof event.type === 'string' ? event.type : 'unknown',
    createdAt: Number.isFinite(event.created) ? event.created * 1000 : Date.now(),
  };

  if (event.type === 'checkout.session.completed') {
    const userId = stringValue(object.metadata?.user_id)
      ?? stringValue(object.client_reference_id);
    const customerId = stringValue(object.customer);
    if (!userId || !customerId) return { ...base, kind: 'ignored' };
    return {
      ...base,
      kind: 'customer_link',
      userId,
      customerId,
      email: stringValue(object.customer_details?.email)
        ?? stringValue(object.customer_email),
    };
  }

  if (typeof event.type === 'string' && event.type.startsWith('customer.subscription.')) {
    const status = stripeSubscriptionStatus(object.status);
    const subscriptionId = stringValue(object.id);
    const customerId = stringValue(object.customer);
    const priceId = stringValue(object.items?.data?.[0]?.price?.id);
    const userId = stringValue(object.metadata?.user_id);
    const planKey = stringValue(object.metadata?.plan_key)
      ?? stripePlanForPrice(priceId, env);
    if (!status || !subscriptionId || !customerId || !planKey) {
      return { ...base, kind: 'ignored' };
    }
    return {
      ...base,
      kind: 'subscription',
      userId,
      customerId,
      subscriptionId,
      priceId,
      planKey,
      status,
      currentPeriodStart: Number.isFinite(object.current_period_start)
        ? object.current_period_start * 1000
        : base.createdAt,
      currentPeriodEnd: Number.isFinite(object.current_period_end)
        ? object.current_period_end * 1000
        : base.createdAt,
    };
  }

  return { ...base, kind: 'ignored' };
}

