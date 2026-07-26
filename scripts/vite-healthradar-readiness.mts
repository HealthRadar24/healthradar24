import type { Plugin } from 'vite';

const CLERK_PUBLISHABLE_KEY_RE = /^pk_(?:live|test)_[A-Za-z0-9_-]+$/;

export interface HealthRadarBuildReadiness {
  schemaVersion: 1;
  product: 'HealthRadar24';
  buildHash: string;
  auth: {
    clerkPublishableKeyConfigured: boolean;
  };
  commerce: {
    browserEnabled: boolean;
    provider: 'disabled' | 'dodo' | 'stripe';
  };
}

export function createHealthRadarBuildReadiness(
  env: NodeJS.ProcessEnv = process.env,
): HealthRadarBuildReadiness {
  const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? '';
  const browserEnabled = env.VITE_PAYMENTS_ENABLED === 'true';
  const configuredProvider = env.BILLING_PROVIDER?.trim().toLowerCase();
  const provider = !browserEnabled
    ? 'disabled'
    : configuredProvider === 'stripe'
      ? 'stripe'
      : 'dodo';

  return {
    schemaVersion: 1,
    product: 'HealthRadar24',
    buildHash: env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
    auth: {
      clerkPublishableKeyConfigured: CLERK_PUBLISHABLE_KEY_RE.test(publishableKey),
    },
    commerce: {
      browserEnabled,
      provider,
    },
  };
}

/**
 * Emit public, non-secret build posture for the live readiness monitor.
 *
 * Vercel's environment-variable inventory proves only that a variable record
 * exists. It does not prove that a Vite client variable reached the generated
 * browser bundle. This manifest is produced by the same build process that
 * inlines `import.meta.env.VITE_*`, so it catches empty/mis-scoped client
 * configuration without exposing any credential value.
 */
export function healthRadarBuildReadinessPlugin(): Plugin {
  return {
    name: 'healthradar-build-readiness',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'healthradar-build.json',
        source: `${JSON.stringify(createHealthRadarBuildReadiness(), null, 2)}\n`,
      });
    },
  };
}
