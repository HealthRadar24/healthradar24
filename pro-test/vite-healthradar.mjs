import {
  applyHealthRadarHtmlBrand,
  HEALTHRADAR_NAME,
} from './healthradar-brand.mjs';

const CLERK_PUBLISHABLE_KEY_RE = /^pk_(?:live|test)_[A-Za-z0-9_-]+$/;

/** @returns {import('vite').Plugin} */
export function healthRadarProPlugin() {
  return {
    name: 'healthradar-pro-surface',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler: applyHealthRadarHtmlBrand,
    },
    generateBundle() {
      const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? '';
      const browserEnabled = process.env.VITE_PAYMENTS_ENABLED === 'true';
      const configuredProvider = process.env.BILLING_PROVIDER?.trim().toLowerCase();
      const provider = !browserEnabled
        ? 'disabled'
        : configuredProvider === 'stripe'
          ? 'stripe'
          : 'dodo';

      this.emitFile({
        type: 'asset',
        fileName: 'healthradar-pro-build.json',
        source: `${JSON.stringify({
          schemaVersion: 1,
          product: HEALTHRADAR_NAME,
          surface: 'pro',
          buildHash: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
          auth: {
            clerkPublishableKeyConfigured: CLERK_PUBLISHABLE_KEY_RE.test(publishableKey),
          },
          commerce: {
            browserEnabled,
            provider,
          },
        }, null, 2)}\n`,
      });
    },
  };
}
