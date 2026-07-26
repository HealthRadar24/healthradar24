import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const checks = [
  {
    file: 'src/services/public-urls.ts',
    required: ["const CANONICAL_PUBLIC_ORIGIN = 'https://www.healthradar24.com';"],
    forbidden: ["const UPSTREAM_PUBLIC_ORIGIN = 'https://worldmonitor.app';"],
  },
  {
    file: 'api/_cors.js',
    required: ["isAllowedOrigin(origin) ? origin : 'https://www.healthradar24.com'"],
    forbidden: ["isAllowedOrigin(origin) ? origin : 'https://worldmonitor.app'"],
  },
  {
    file: 'server/cors.ts',
    required: ["isAllowedOrigin(origin) ? origin : 'https://www.healthradar24.com'"],
    forbidden: ["isAllowedOrigin(origin) ? origin : 'https://worldmonitor.app'"],
  },
  {
    file: 'workers/api-cors-preflight/src/index.js',
    required: ["isAllowedOrigin(origin) ? origin : 'https://www.healthradar24.com'"],
    forbidden: ["isAllowedOrigin(origin) ? origin : 'https://worldmonitor.app'"],
  },
  {
    file: 'workers/api-cors-preflight/wrangler.toml',
    required: ['pattern = "api.healthradar24.com/*"', 'zone_name = "healthradar24.com"'],
    forbidden: ['pattern = "api.worldmonitor.app/*"', 'zone_name = "worldmonitor.app"'],
  },
  {
    file: '.github/workflows/build-desktop.yml',
    required: ['VITE_WS_API_URL: https://www.healthradar24.com'],
    forbidden: ['VITE_WS_API_URL: https://worldmonitor.app'],
  },
  {
    file: '.github/workflows/docker-publish.yml',
    required: ['images: ghcr.io/${{ github.repository }}'],
    forbidden: ['images: ghcr.io/koala73/worldmonitor'],
  },
  {
    file: 'api/create-checkout.ts',
    required: [
      "const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';",
      'const BILLING_PROVIDER = billingProvider();',
      "if (BILLING_PROVIDER === 'stripe')",
    ],
    forbidden: [],
  },
  {
    file: 'api/customer-portal.ts',
    required: [
      "const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';",
      "if (!PAYMENTS_ENABLED)",
      "if (BILLING_PROVIDER === 'stripe')",
    ],
    forbidden: [],
  },
  {
    file: 'api/stripe-webhook.ts',
    required: [
      "const STRIPE_WEBHOOK_ENABLED = process.env.STRIPE_WEBHOOK_ENABLED === 'true';",
      'verifyStripeSignature',
      '/relay/billing-event',
    ],
    forbidden: [],
  },
  {
    file: 'api/_billing-provider.js',
    required: [
      "const value = (env.BILLING_PROVIDER ?? 'dodo')",
      'STRIPE_LIVE_MODE_APPROVED',
      'STRIPE_TEST_KEY_REQUIRED',
    ],
    forbidden: [],
  },
  {
    file: 'api/product-catalog.js',
    required: [
      "const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';",
      "href: 'https://healthradar24.com/dashboard'",
      "href: 'https://healthradar24.com/pro#enterprise-contact'",
    ],
    forbidden: [],
  },
  {
    file: 'package.json',
    required: [
      '"build:pro:dist": "cd pro-test && npm ci && PRO_BUILD_OUT_DIR=../dist/pro npm run build"',
      'vite build && npm run build:pro:dist',
    ],
    forbidden: [],
  },
  {
    file: 'pro-test/.env.production',
    required: ['VITE_CLERK_PUBLISHABLE_KEY='],
    forbidden: ['pk_live_'],
  },
  {
    file: 'scripts/healthradar-readiness.json',
    required: [
      '"webBaseUrl": "https://www.healthradar24.com"',
      '"proBuildReadinessUrl": "https://www.healthradar24.com/pro/healthradar-pro-build.json"',
      '"commerceBrowserEnabled": false',
      '"commerceProvider": "disabled"',
    ],
    forbidden: [],
  },
  {
    file: 'public/.well-known/security.txt',
    required: [
      'Canonical: https://www.healthradar24.com/.well-known/security.txt',
      'https://github.com/HealthRadar24/healthradar24/security/advisories/new',
    ],
    forbidden: [
      'Canonical: https://www.worldmonitor.app/.well-known/security.txt',
    ],
  },
  {
    file: 'vercel.json',
    required: [
      '"source": "/support"',
      '"destination": "/healthradar/support.html"',
      '"source": "/privacy"',
      '"destination": "/healthradar/privacy.html"',
      '"source": "/terms"',
      '"destination": "/healthradar/terms.html"',
    ],
    forbidden: [],
  },
  {
    file: 'README.md',
    required: [
      '# HealthRadar24',
      'docs/healthradar-operations.md',
      'docs/healthradar-provider-policy.md',
      'docs/healthradar-commercial-launch.md',
      'docs/healthradar-healthcare-foundation.md',
    ],
    forbidden: [],
  },
  {
    file: 'convex/schema.ts',
    required: [
      'billingCustomers: defineTable({',
      'billingSubscriptions: defineTable({',
      'billingWebhookEvents: defineTable({',
      'billingProviderLocks: defineTable({',
      'billingProvider: v.optional(v.union(',
    ],
    forbidden: [],
  },
  {
    file: 'shared/healthradar-health-sources.json',
    required: [
      '"protectedHealthInformation": "prohibited"',
      '"id": "diseaseOutbreaks"',
      '"id": "healthAirQuality"',
    ],
    forbidden: [],
  },
  {
    file: '.github/workflows/fork-invariants.yml',
    required: [
      'npm run fork:readiness:config',
      'npm run health:governance',
    ],
    forbidden: [],
  },
];

const failures = [];

for (const check of checks) {
  const source = await readFile(resolve(root, check.file), 'utf8');
  for (const expected of check.required) {
    if (!source.includes(expected)) {
      failures.push(`${check.file}: missing fork invariant ${JSON.stringify(expected)}`);
    }
  }
  for (const forbidden of check.forbidden) {
    if (source.includes(forbidden)) {
      failures.push(`${check.file}: restored upstream operational value ${JSON.stringify(forbidden)}`);
    }
  }
}

if (failures.length > 0) {
  console.error('HealthRadar24 fork invariants failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nResolve these before merging an upstream sync. See FORK_SYNC.md.');
  process.exitCode = 1;
} else {
  console.log(`HealthRadar24 fork invariants passed (${checks.length} files checked).`);
}
