#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CONFIG_URL = new URL('./healthradar-readiness.json', import.meta.url);
const EXPECTED_HOSTS = Object.freeze({
  webBaseUrl: 'www.healthradar24.com',
  apiBaseUrl: 'api.healthradar24.com',
  healthUrl: 'api.healthradar24.com',
});

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertHttpsUrl(value, label, expectedHost) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${label} must use HTTPS`);
  if (parsed.hostname !== expectedHost) {
    throw new Error(`${label} must use ${expectedHost}, received ${parsed.hostname}`);
  }
  return parsed;
}

function assertUniqueNames(entries, label) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    assertObject(entry, `${label}[${index}]`);
    if (typeof entry.name !== 'string' || entry.name.length === 0) {
      throw new Error(`${label}[${index}].name must be a non-empty string`);
    }
    if (seen.has(entry.name)) throw new Error(`${label} contains duplicate ${entry.name}`);
    seen.add(entry.name);
  }
  return seen;
}

export function validateReadinessConfig(config) {
  assertObject(config, 'Readiness config');
  if (config.schemaVersion !== 1) throw new Error('Readiness config schemaVersion must be 1');
  assertObject(config.identity, 'Readiness config identity');

  for (const [field, expectedHost] of Object.entries(EXPECTED_HOSTS)) {
    assertHttpsUrl(config.identity[field], `identity.${field}`, expectedHost);
  }
  const healthUrl = new URL(config.identity.healthUrl);
  if (healthUrl.pathname !== '/api/health' || healthUrl.searchParams.get('compact') !== '1') {
    throw new Error('identity.healthUrl must target /api/health?compact=1');
  }

  if (!Number.isFinite(config.maxHealthAgeMinutes) || config.maxHealthAgeMinutes <= 0) {
    throw new Error('maxHealthAgeMinutes must be a positive number');
  }
  if (!Number.isInteger(config.minimumHealthRegistrySize) || config.minimumHealthRegistrySize <= 0) {
    throw new Error('minimumHealthRegistrySize must be a positive integer');
  }

  const required = assertUniqueNames(config.requiredHealthChecks, 'requiredHealthChecks');
  const blocked = assertUniqueNames(config.providerBlockedChecks, 'providerBlockedChecks');
  for (const entry of config.requiredHealthChecks) {
    if (typeof entry.reason !== 'string' || entry.reason.length === 0) {
      throw new Error(`requiredHealthChecks.${entry.name}.reason must be a non-empty string`);
    }
  }
  for (const entry of config.providerBlockedChecks) {
    if (required.has(entry.name)) {
      throw new Error(`${entry.name} cannot be both required and provider-blocked`);
    }
    if (typeof entry.provider !== 'string' || entry.provider.length === 0) {
      throw new Error(`providerBlockedChecks.${entry.name}.provider must be a non-empty string`);
    }
    if (typeof entry.unblock !== 'string' || entry.unblock.length === 0) {
      throw new Error(`providerBlockedChecks.${entry.name}.unblock must be a non-empty string`);
    }
  }
  return { required, blocked };
}

export function evaluateReadinessPayload(config, payload, now = Date.now()) {
  validateReadinessConfig(config);
  assertObject(payload, 'Compact health payload');
  assertObject(payload.summary, 'Compact health payload summary');

  const failures = [];
  if (payload.status === 'REDIS_DOWN') failures.push('Redis is unavailable');
  if (!Number.isInteger(payload.summary.total)
      || payload.summary.total < config.minimumHealthRegistrySize) {
    failures.push(
      `Health registry contains ${payload.summary.total ?? 'unknown'} checks; `
      + `expected at least ${config.minimumHealthRegistrySize}`,
    );
  }

  const checkedAt = Date.parse(payload.checkedAt);
  const maxAgeMs = config.maxHealthAgeMinutes * 60_000;
  if (!Number.isFinite(checkedAt)) {
    failures.push('Health payload checkedAt is invalid');
  } else if (checkedAt > now + 60_000 || now - checkedAt > maxAgeMs) {
    failures.push(`Health payload is older than ${config.maxHealthAgeMinutes} minutes`);
  }

  const problems = payload.problems == null ? {} : payload.problems;
  assertObject(problems, 'Compact health payload problems');

  for (const check of config.requiredHealthChecks) {
    const problem = problems[check.name];
    if (problem) {
      failures.push(`${check.name} is ${problem.status || 'unhealthy'} (${check.reason})`);
    }
  }

  const providerBlockers = config.providerBlockedChecks
    .filter((check) => problems[check.name])
    .map((check) => ({
      ...check,
      status: problems[check.name].status || 'unhealthy',
    }));
  const classifiedNames = new Set([
    ...config.requiredHealthChecks.map((check) => check.name),
    ...config.providerBlockedChecks.map((check) => check.name),
  ]);
  const advisoryProblems = Object.entries(problems)
    .filter(([name]) => !classifiedNames.has(name))
    .map(([name, problem]) => ({ name, status: problem?.status || 'unhealthy' }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { failures, providerBlockers, advisoryProblems };
}

export async function loadReadinessConfig() {
  const config = JSON.parse(await readFile(CONFIG_URL, 'utf8'));
  validateReadinessConfig(config);
  return config;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'healthradar24-fork-readiness/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function requireReachableWeb(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'healthradar24-fork-readiness/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  if (new URL(response.url).hostname !== EXPECTED_HOSTS.webBaseUrl) {
    throw new Error(`${url} redirected outside ${EXPECTED_HOSTS.webBaseUrl}`);
  }
}

async function main() {
  const config = await loadReadinessConfig();
  if (process.argv.includes('--config-only')) {
    console.log(
      `HealthRadar24 readiness config passed `
      + `(${config.requiredHealthChecks.length} required, `
      + `${config.providerBlockedChecks.length} provider-blocked).`,
    );
    return;
  }

  const webBaseUrl = process.env.WM_WEB_BASE_URL || config.identity.webBaseUrl;
  const healthUrl = process.env.WM_HEALTH_URL || config.identity.healthUrl;
  assertHttpsUrl(webBaseUrl, 'WM_WEB_BASE_URL', EXPECTED_HOSTS.webBaseUrl);
  assertHttpsUrl(healthUrl, 'WM_HEALTH_URL', EXPECTED_HOSTS.healthUrl);

  await requireReachableWeb(webBaseUrl);
  const payload = await fetchJson(healthUrl);
  const result = evaluateReadinessPayload(config, payload);

  for (const blocker of result.providerBlockers) {
    console.warn(
      `[provider-blocked] ${blocker.name}: ${blocker.status}; `
      + `${blocker.provider}; ${blocker.unblock}`,
    );
  }
  if (result.advisoryProblems.length > 0) {
    console.log(
      `Advisory upstream health problems: ${result.advisoryProblems.length} `
      + '(not part of the intentional HealthRadar24 release baseline).',
    );
  }
  if (result.failures.length > 0) {
    console.error('HealthRadar24 readiness failed:');
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `HealthRadar24 readiness passed at ${payload.checkedAt}: `
    + `${config.requiredHealthChecks.length} required checks are healthy.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
