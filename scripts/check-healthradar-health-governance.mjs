import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const [
  policySource,
  readinessSource,
  healthSource,
  bundleSource,
  brandSource,
  panelSource,
  charterSource,
  contributingSource,
  proposalTemplateSource,
] = await Promise.all([
  read('shared/healthradar-health-sources.json'),
  read('scripts/healthradar-readiness.json'),
  read('api/health.js'),
  read('scripts/seed-bundle-health.mjs'),
  read('src/config/product-brand.ts'),
  read('src/components/DiseaseOutbreaksPanel.ts'),
  read('docs/healthradar-open-source.md'),
  read('CONTRIBUTING.md'),
  read('.github/ISSUE_TEMPLATE/health_data_source.yml'),
]);

const policy = JSON.parse(policySource);
const readiness = JSON.parse(readinessSource);
const failures = [];

if (policy.schemaVersion !== 2) failures.push('unsupported healthcare governance schema');
for (const field of ['purpose', 'clinicalUse', 'personalData', 'protectedHealthInformation']) {
  if (!policy.productBoundary?.[field]) failures.push(`productBoundary.${field} is required`);
}
if (policy.productBoundary?.protectedHealthInformation !== 'prohibited') {
  failures.push('protected health information must remain prohibited in the baseline');
}
for (const field of ['medicalDeviceClaim', 'clinicalDecisionSupport']) {
  if (policy.productBoundary?.[field] !== 'prohibited') {
    failures.push(`productBoundary.${field} must remain prohibited`);
  }
}

const openSource = policy.openSource ?? {};
if (openSource.license !== 'AGPL-3.0-only') {
  failures.push('openSource.license must stay AGPL-3.0-only');
}
if (openSource.charterDoc !== 'docs/healthradar-open-source.md') {
  failures.push('openSource.charterDoc must point at the open-source charter');
}
if (!openSource.upstreamRepository?.includes('koala73/worldmonitor')) {
  failures.push('openSource.upstreamRepository must credit the upstream project');
}
if (openSource.positioning !== 'open_source_healthcare_and_life_science_intelligence') {
  failures.push('openSource.positioning must declare the healthcare and life-science scope');
}
if (openSource.selfHostingSupported !== true) {
  failures.push('openSource.selfHostingSupported must stay true under AGPL-3.0-only');
}
if (openSource.contributionGuide && !contributingSource.includes('healthradar-open-source.md')) {
  failures.push('CONTRIBUTING.md must link the open-source healthcare charter');
}
if (!proposalTemplateSource.includes('healthradar-open-source.md')) {
  failures.push('the source proposal template must link the open-source healthcare charter');
}

const domains = Array.isArray(policy.domains) ? policy.domains : [];
if (domains.length === 0) failures.push('at least one governed domain is required');
const domainIds = new Set();
for (const domain of domains) {
  const label = domain.id ?? 'unknown';
  for (const field of ['id', 'name', 'scope']) {
    if (!domain[field]) failures.push(`domain ${label}.${field} is required`);
  }
  if (domain.id) {
    if (domainIds.has(domain.id)) failures.push(`domain ${domain.id} is declared twice`);
    domainIds.add(domain.id);
  }
  if (!Array.isArray(domain.primarySourceClasses) || domain.primarySourceClasses.length === 0) {
    failures.push(`domain ${label} must declare primarySourceClasses`);
  }
  if (!Array.isArray(domain.exclusions) || domain.exclusions.length === 0) {
    failures.push(`domain ${label} must declare exclusions`);
  }
  if (domain.id && !charterSource.includes(`\`${domain.id}\``)) {
    failures.push(`domain ${domain.id} is absent from the open-source charter`);
  }
}

const requiredChecks = new Set(
  (readiness.requiredHealthChecks ?? []).map((entry) => entry.name),
);
const deferredChecks = new Set(
  (readiness.deferredHealthChecks ?? []).map((entry) => entry.name),
);

const validateSources = (label, sources) => {
  if (!Array.isArray(sources) || sources.length === 0) {
    failures.push(`${label} must declare at least one source`);
    return;
  }
  const sourceIds = new Set();
  for (const source of sources) {
    for (const field of ['id', 'name', 'role', 'credential', 'commercialTermsReview']) {
      if (!source[field]) failures.push(`${label} source missing ${field}`);
    }
    if (source.id) {
      if (sourceIds.has(source.id)) failures.push(`${label} declares source ${source.id} twice`);
      sourceIds.add(source.id);
    }
  }
};

const validateCadence = (label, capability) => {
  if (!Number.isFinite(capability.cadenceMinutes) || capability.cadenceMinutes <= 0) {
    failures.push(`${label}.cadenceMinutes must be positive`);
  }
  if (
    !Number.isFinite(capability.maxStaleMinutes) ||
    capability.maxStaleMinutes < capability.cadenceMinutes
  ) {
    failures.push(`${label}.maxStaleMinutes must cover at least one cadence`);
  }
};

const capabilityIds = new Set();
const capabilities = Array.isArray(policy.capabilities) ? policy.capabilities : [];
for (const capability of capabilities) {
  const label = capability.id ?? 'unknown';
  for (const field of [
    'id',
    'domain',
    'apiRoute',
    'canonicalKey',
    'seedMetaKey',
    'dataClass',
    'decisionUse',
  ]) {
    if (!capability[field]) failures.push(`${label}.${field} is required`);
  }
  if (capability.id) {
    if (capabilityIds.has(capability.id)) failures.push(`${capability.id} is declared twice`);
    capabilityIds.add(capability.id);
  }
  if (capability.domain && !domainIds.has(capability.domain)) {
    failures.push(`${label}.domain ${capability.domain} is not a governed domain`);
  }
  if (capability.status === 'required_baseline' && !requiredChecks.has(capability.id)) {
    failures.push(`${capability.id} is baseline but absent from readiness.requiredHealthChecks`);
  }
  if (capability.status === 'deferred_candidate' && !deferredChecks.has(capability.id)) {
    failures.push(
      `${capability.id} is deferred but absent from readiness.deferredHealthChecks`,
    );
  }
  if (!['required_baseline', 'deferred_candidate'].includes(capability.status)) {
    failures.push(`${label}.status must be required_baseline or deferred_candidate`);
  }
  validateCadence(label, capability);
  if (!healthSource.includes(capability.canonicalKey)) {
    failures.push(`${label} canonical key is absent from api/health.js`);
  }
  if (!healthSource.includes(capability.seedMetaKey)) {
    failures.push(`${label} seed-meta key is absent from api/health.js`);
  }
  const routeSlug = capability.apiRoute?.split('/').at(-1);
  if (!routeSlug || !policySource.includes(routeSlug)) {
    failures.push(`${label} API route is malformed`);
  }
  validateSources(label, capability.sources);
}

const roadmap = Array.isArray(policy.roadmapCapabilities) ? policy.roadmapCapabilities : [];
for (const capability of roadmap) {
  const label = capability.id ?? 'unknown';
  for (const field of [
    'id',
    'domain',
    'proposedApiRoute',
    'proposedCanonicalKey',
    'proposedSeedMetaKey',
    'dataClass',
    'decisionUse',
    'rationale',
  ]) {
    if (!capability[field]) failures.push(`roadmap ${label}.${field} is required`);
  }
  if (capability.status !== 'roadmap_candidate') {
    failures.push(`roadmap ${label}.status must be roadmap_candidate`);
  }
  if (capability.id) {
    if (capabilityIds.has(capability.id)) {
      failures.push(`${capability.id} is declared as both a capability and a roadmap candidate`);
    }
    capabilityIds.add(capability.id);
  }
  if (capability.domain && !domainIds.has(capability.domain)) {
    failures.push(`roadmap ${label}.domain ${capability.domain} is not a governed domain`);
  }
  validateCadence(`roadmap ${label}`, capability);
  if (capability.proposedApiRoute && !capability.proposedApiRoute.startsWith('/api/health/v1/')) {
    failures.push(`roadmap ${label}.proposedApiRoute must sit under /api/health/v1/`);
  }
  if (capability.proposedCanonicalKey && !/^health:[a-z0-9-]+:v\d+$/.test(capability.proposedCanonicalKey)) {
    failures.push(`roadmap ${label}.proposedCanonicalKey must look like health:<name>:v<n>`);
  }
  if (capability.proposedSeedMetaKey && !capability.proposedSeedMetaKey.startsWith('seed-meta:health:')) {
    failures.push(`roadmap ${label}.proposedSeedMetaKey must sit under seed-meta:health:`);
  }
  if (requiredChecks.has(capability.id)) {
    failures.push(`${capability.id} is a roadmap candidate but claimed as a required health check`);
  }
  if (capability.proposedCanonicalKey && healthSource.includes(capability.proposedCanonicalKey)) {
    failures.push(
      `${capability.id} is plumbed in api/health.js and must be promoted out of roadmapCapabilities`,
    );
  }
  if (!Array.isArray(capability.requiredPlumbing) || capability.requiredPlumbing.length === 0) {
    failures.push(`roadmap ${label} must declare requiredPlumbing`);
  }
  if (!Array.isArray(capability.promotionGates) || capability.promotionGates.length === 0) {
    failures.push(`roadmap ${label} must declare promotionGates`);
  }
  validateSources(`roadmap ${label}`, capability.sources);
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
    `HealthRadar healthcare governance passed (${domains.length} governed domains, `
      + `${capabilities.length} plumbed capabilities, ${roadmap.length} roadmap candidates).`,
  );
}
