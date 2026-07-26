/**
 * Stripe webhook ingress for HealthRadar24.
 *
 * Verifies Stripe's signature over the raw body, reduces the payload to a
 * provider-neutral event, then relays it to Convex. It is independently gated
 * from checkout so test webhooks can be exercised while commerce stays off.
 */

export const config = { runtime: 'edge' };

// @ts-expect-error — self-contained Edge helper, intentionally plain JS
import { billingProvider } from './_billing-provider.js';
// @ts-expect-error — self-contained Edge helper, intentionally plain JS
import { normalizeStripeEvent, verifyStripeSignature } from './_stripe-webhook.js';

const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL ??
  (process.env.CONVEX_URL ?? '').replace('.convex.cloud', '.convex.site');
const RELAY_SHARED_SECRET = process.env.RELAY_SHARED_SECRET ?? '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const STRIPE_WEBHOOK_ENABLED = process.env.STRIPE_WEBHOOK_ENABLED === 'true';

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  if (
    !STRIPE_WEBHOOK_ENABLED ||
    billingProvider() !== 'stripe' ||
    !STRIPE_WEBHOOK_SECRET
  ) {
    return response({ error: 'STRIPE_WEBHOOK_DISABLED' }, 503);
  }
  if (!CONVEX_SITE_URL || !RELAY_SHARED_SECRET) {
    return response({ error: 'SERVICE_UNAVAILABLE' }, 503);
  }

  const rawBody = await req.text();
  const signatureValid = await verifyStripeSignature({
    payload: rawBody,
    signatureHeader: req.headers.get('stripe-signature'),
    secret: STRIPE_WEBHOOK_SECRET,
  });
  if (!signatureValid) return response({ error: 'INVALID_SIGNATURE' }, 400);

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return response({ error: 'INVALID_JSON' }, 400);
  }
  const normalized = normalizeStripeEvent(event);
  if (!normalized) return response({ error: 'INVALID_EVENT' }, 400);
  if (normalized.kind === 'ignored') {
    return response({ received: true, ignored: true }, 200);
  }

  try {
    const relay = await fetch(`${CONVEX_SITE_URL}/relay/billing-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RELAY_SHARED_SECRET}`,
        'User-Agent': 'healthradar24-stripe-webhook-edge/1.0',
      },
      body: JSON.stringify({ provider: 'stripe', ...normalized }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await relay.json().catch(() => ({}));
    if (!relay.ok) {
      console.error('[stripe-webhook] Convex relay failed', { status: relay.status });
      return response({ error: 'WEBHOOK_PROCESSING_FAILED' }, 502);
    }
    return response({ received: true, result: body }, 200);
  } catch (error) {
    console.error('[stripe-webhook] Convex relay unavailable', {
      message: error instanceof Error ? error.message : String(error),
    });
    return response({ error: 'WEBHOOK_PROCESSING_UNAVAILABLE' }, 502);
  }
}
