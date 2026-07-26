import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const [policySource, readinessSource, healthSource, bundleSource, brandSource, panelSource] =
  await Promise.all([
    read('shared/healthradar-health-sources.json'),
    read('scripts/healthradar-readiness.json'),
    read('api/health.js'),
    read('scripts/seed-bundle-health.mjs'),
    read('src/config/product-brand.ts'),
    read('src/components/DiseaseOutbreaksPanel.ts'),
  ]);

const policy = JSON.parse(policySource);
const readiness = JSON.parse(readinessSource);
const failures = [];

if (policy.schemaVersion !== 1) failures.push('unsupported healthcare governance schema');
for (const field of ['purpose', 'clinicalUse', 'personalData', 'protectedHealthInformation']) {
  if (!policy.productBoundary?.[field]) failures.push(`productBoundary.${field} is required`);
}
if (policy.productBoundary?.protectedHealthInformation !== 'prohibited') {
  failures.push('protected health information must remain prohibited in the baseline');
}

const requiredChecks = new Set(
  (readiness.requiredHealthChecks ?? []).map((entry) => entry.name),
);
const capabilities = Array.isArray(policy.capabilities) ? policy.capabilities : [];
for (const capability of capabilities) {
  for (const field of [
    'id',
    'apiRoute',
    'canonicalKey',
    'seedMetaKey',
    'dataClass',
    'decisionUse',
  ]) {
    if (!capability[field]) failures.push(`${capability.id ?? 'unknown'}.${field} is required`);
  }
  if (capability.status === 'required_baseline' && !requiredChecks.has(capability.id)) {
    failures.push(`${capability.id} is baseline but absent from readiness.requiredHealthChecks`);
  }
  if (!Number.isFinite(capability.cadenceMinutes) || capability.cadenceMinutes <= 0) {
    failures.push(`${capability.id}.cadenceMinutes must be positive`);
  }
  if (
    !Number.isFinite(capability.maxStaleMinutes) ||
    capability.maxStaleMinutes < capability.cadenceMinutes
  ) {
    failures.push(`${capability.id}.maxStaleMinutes must cover at least one cadence`);
  }
  if (!healthSource.includes(capability.canonicalKey)) {
    failures.push(`${capability.id} canonical key is absent from api/health.js`);
  }
  if (!healthSource.includes(capability.seedMetaKey)) {
    failures.push(`${capability.id} seed-meta key is absent from api/health.js`);
  }
  const routeSlug = capability.apiRoute.split('/').at(-1);
  if (!routeSlug || !policySource.includes(routeSlug)) {
    failures.push(`${capability.id} API route is malformed`);
  }
  if (!Array.isArray(capability.sources) || capability.sources.length === 0) {
    failures.push(`${capability.id} must declare at least one source`);
  }
  for (const source of capability.sources ?? []) {
    for (const field of ['id', 'name', 'role', 'credential', 'commercialTermsReview']) {
      if (!source[field]) failures.push(`${capability.id} source missing ${field}`);
    }
  }
}

for (const label of ['Disease-Outbreaks', 'Air-Quality']) {
  if (!bundleSource.includes(label)) failures.push(`health seed bundle missing ${label}`);
}
if (!brandSource.includes('healthSignalDisclaimer')) {
  failures.push('product brand must declare a health signal disclaimer');
}
if (!panelSource.includes('PRODUCT_BRAND.healthSignalDisclaimer')) {
  failures.push('disease outbreak panel must render the fork health disclaimer');
}

if (failures.length > 0) {
  console.error('HealthRadar healthcare governance failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `HealthRadar healthcare governance passed (${capabilities.length} baseline capabilities).`,
  );
}

