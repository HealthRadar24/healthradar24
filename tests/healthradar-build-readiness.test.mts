import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createHealthRadarBuildReadiness,
} from '../scripts/vite-healthradar-readiness.mts';

describe('HealthRadar build readiness manifest', () => {
  it('reports configured Clerk without exposing the publishable key', () => {
    const manifest = createHealthRadarBuildReadiness({
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_aGVhbHRocmFkYXIyNC5leGFtcGxlLmNvbSQ',
      VERCEL_GIT_COMMIT_SHA: 'abc123',
      VITE_PAYMENTS_ENABLED: 'false',
    });

    assert.equal(manifest.auth.clerkPublishableKeyConfigured, true);
    assert.equal(manifest.buildHash, 'abc123');
    assert.equal(manifest.commerce.provider, 'disabled');
    assert.doesNotMatch(JSON.stringify(manifest), /pk_test_/);
  });

  it('fails the auth posture for empty or malformed client configuration', () => {
    assert.equal(
      createHealthRadarBuildReadiness({}).auth.clerkPublishableKeyConfigured,
      false,
    );
    assert.equal(
      createHealthRadarBuildReadiness({
        VITE_CLERK_PUBLISHABLE_KEY: 'not-a-clerk-key',
      }).auth.clerkPublishableKeyConfigured,
      false,
    );
  });

  it('selects Stripe only when browser commerce is explicitly enabled', () => {
    const disabled = createHealthRadarBuildReadiness({
      BILLING_PROVIDER: 'stripe',
      VITE_PAYMENTS_ENABLED: 'false',
    });
    assert.equal(disabled.commerce.provider, 'disabled');

    const stripe = createHealthRadarBuildReadiness({
      BILLING_PROVIDER: 'stripe',
      VITE_PAYMENTS_ENABLED: 'true',
    });
    assert.equal(stripe.commerce.provider, 'stripe');
  });
});
