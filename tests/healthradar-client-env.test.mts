import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyHealthRadarClientEnvAliases,
  resolveHealthRadarClientEnv,
} from '../scripts/healthradar-client-env.mts';

describe('HealthRadar public client environment aliases', () => {
  it('prefers canonical Vite names and accepts provider integration aliases', () => {
    assert.deepEqual(resolveHealthRadarClientEnv({
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_canonical',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_alias',
      CONVEX_URL: 'https://healthradar.convex.cloud',
    }), {
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_canonical',
      VITE_CONVEX_URL: 'https://healthradar.convex.cloud',
    });
  });

  it('maps only public Clerk and Convex values into the Vite namespace', () => {
    const loaded: Record<string, string | undefined> = {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_from_integration',
      NEXT_PUBLIC_CONVEX_URL: 'https://preview.convex.cloud',
      CLERK_SECRET_KEY: 'must-not-be-mapped',
      CONVEX_DEPLOY_KEY: 'must-not-be-mapped',
    };
    const target: Record<string, string | undefined> = {};

    applyHealthRadarClientEnvAliases(loaded, target);

    assert.equal(target.VITE_CLERK_PUBLISHABLE_KEY, 'pk_test_from_integration');
    assert.equal(target.VITE_CONVEX_URL, 'https://preview.convex.cloud');
    assert.equal(target.VITE_CLERK_SECRET_KEY, undefined);
    assert.equal(target.VITE_CONVEX_DEPLOY_KEY, undefined);
  });
});
