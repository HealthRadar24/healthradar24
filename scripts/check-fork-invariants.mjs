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
    required: ["const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';"],
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
