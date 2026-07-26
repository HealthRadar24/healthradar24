# HealthRadar24 commercial launch

This checklist separates implementation readiness from authority to transact.
Completing the code does not authorize live payments.

## Stage 0: disabled baseline

- `PAYMENTS_ENABLED=false`
- `VITE_PAYMENTS_ENABLED=false`
- `BILLING_ENVIRONMENT=test_mode`
- `STRIPE_LIVE_MODE_APPROVED=false`
- Public catalog omits product IDs and prices.
- Support, privacy, terms, security, and non-medical-advice pages are live.

This is the required state for normal upstream syncing and healthcare feature
development.

## Stage 1: Stripe test mode

1. Create Stripe test products/prices for each supported plan.
2. Configure the `STRIPE_PRICE_*` variables in Vercel Production and Preview.
3. Set `BILLING_PROVIDER=stripe` and keep
   `BILLING_ENVIRONMENT=test_mode`.
4. Configure `STRIPE_SECRET_KEY=sk_test_*` and the webhook signing secret.
5. Deploy Convex, then run the provider-lock seed:

   ```bash
   npx convex run payments/providerBilling:seedProviderLocks
   ```

6. Register `/api/stripe-webhook` in Stripe test mode and set
   `STRIPE_WEBHOOK_ENABLED=true`.
7. Keep both payment gates false until webhook ingress, customer linking, and
   entitlement mutation are verified from signed fixtures.
8. In a controlled Preview environment only, enable both gates and complete:
   Checkout, 3DS/test decline, retry, Customer Portal, renewal, failed payment,
   cancellation, duplicate webhook, and out-of-order webhook tests.
9. Return both gates to false after the test window.

## Provider migration contract

The inherited Dodo integration remains in place. Stripe writes additive
`billingCustomers`, `billingSubscriptions`, and `billingWebhookEvents` rows.
Entitlements identify their owning provider so a Stripe cancellation cannot
revoke a stronger manual or legacy grant.

For an existing paid user:

- do not create a second active subscription automatically;
- preserve the current entitlement until its paid-through date;
- create the Stripe subscription only after explicit customer action;
- cancel the legacy provider only after the Stripe subscription is confirmed;
- retain provider event IDs for audit and replay;
- use the dual server/browser kill switches for rollback.

No bulk migration runs until a real customer cohort exists and the operator has
approved customer communication.

## Stage 2: legal and account readiness

The operator must approve and supply:

- legal entity/trading name, address, jurisdiction, and support contact;
- final plan names, currencies, prices, trial policy, and renewal terms;
- refund/cancellation policy and tax/VAT handling;
- Stripe statement descriptor and customer support details;
- privacy terms for analytics, authentication, payment, and healthcare data;
- confirmation that the intended use complies with AGPL and upstream trademark
  constraints;
- Vercel plan suitable for a commercial service.

The current static legal pages are safe pre-launch disclosures, not a substitute
for jurisdiction-specific legal review.

## Stage 3: live-mode approval

1. Repeat the complete Preview matrix with Stripe test mode.
2. Run all fork, type, data, Edge bundle, Convex, build, and live-readiness
   checks.
3. Configure live Stripe products, live webhook, and `sk_live_*` only in
   Production.
4. Set `BILLING_ENVIRONMENT=live_mode`.
5. Set `STRIPE_LIVE_MODE_APPROVED=true`.
6. Confirm the public catalog contains only HealthRadar plan keys and live
   Stripe prices.
7. Obtain explicit user approval for the exact production enablement.
8. Set `PAYMENTS_ENABLED=true`, then `VITE_PAYMENTS_ENABLED=true`.
9. Complete one low-risk real transaction, portal access, webhook, entitlement,
   cancellation/refund, and support verification.

If any verification fails, set both payment gates false first; payment rollback
must not take the public intelligence dashboard offline.
