import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  evaluateReadinessPayload,
  validateReadinessConfig,
} from '../scripts/check-fork-readiness.mjs';

const config = JSON.parse(readFileSync(
  new URL('../scripts/healthradar-readiness.json', import.meta.url),
  'utf8',
));

function healthyPayload(overrides = {}) {
  return {
    status: 'UNHEALTHY',
    summary: { total: 239, ok: 160, warn: 12, onDemandWarn: 10, crit: 57 },
    checkedAt: '2026-07-26T18:00:00.000Z',
    problems: {
      unrestEvents: { status: 'EMPTY' },
      unrelatedOptionalFeed: { status: 'STALE_SEED' },
    },
    ...overrides,
  };
}

describe('HealthRadar24 fork readiness', () => {
  it('pins production identity to HealthRadar24 and keeps required checks disjoint', () => {
    const sets = validateReadinessConfig(config);

    assert.equal(new URL(config.identity.webBaseUrl).hostname, 'www.healthradar24.com');
    assert.equal(new URL(config.identity.apiBaseUrl).hostname, 'api.healthradar24.com');
    assert.equal(new URL(config.identity.healthUrl).hostname, 'api.healthradar24.com');
    assert.equal([...sets.required].some((name) => sets.blocked.has(name)), false);
  });

  it('accepts provider-blocked and advisory upstream gaps when the intentional baseline is healthy', () => {
    const result = evaluateReadinessPayload(
      config,
      healthyPayload(),
      Date.parse('2026-07-26T18:01:00.000Z'),
    );

    assert.deepEqual(result.failures, []);
    assert.deepEqual(
      result.providerBlockers.map(({ name, status }) => ({ name, status })),
      [{ name: 'unrestEvents', status: 'EMPTY' }],
    );
    assert.deepEqual(result.advisoryProblems, [
      { name: 'unrelatedOptionalFeed', status: 'STALE_SEED' },
    ]);
  });

  it('fails when a required pipeline is unhealthy or the health snapshot is stale', () => {
    const result = evaluateReadinessPayload(
      config,
      healthyPayload({
        checkedAt: '2026-07-26T17:40:00.000Z',
        problems: { diseaseOutbreaks: { status: 'STALE_SEED' } },
      }),
      Date.parse('2026-07-26T18:00:00.000Z'),
    );

    assert.equal(result.failures.length, 2);
    assert.match(result.failures[0], /older than 5 minutes/);
    assert.match(result.failures[1], /diseaseOutbreaks is STALE_SEED/);
  });

  it('fails closed when Redis or the inherited registry is unavailable', () => {
    const result = evaluateReadinessPayload(
      config,
      healthyPayload({
        status: 'REDIS_DOWN',
        summary: { total: 0 },
      }),
      Date.parse('2026-07-26T18:01:00.000Z'),
    );

    assert.match(result.failures.join('\n'), /Redis is unavailable/);
    assert.match(result.failures.join('\n'), /expected at least 200/);
  });

  it('keeps every configured check registered in the upstream health implementation', () => {
    const healthSource = readFileSync(new URL('../api/health.js', import.meta.url), 'utf8');
    for (const check of [
      ...config.requiredHealthChecks,
      ...config.providerBlockedChecks,
    ]) {
      assert.match(healthSource, new RegExp(`^\\s*${check.name}:`, 'm'), check.name);
    }
  });

  it('runs config validation on PRs and live readiness on a schedule', () => {
    const invariantWorkflow = readFileSync(
      new URL('../.github/workflows/fork-invariants.yml', import.meta.url),
      'utf8',
    );
    const readinessWorkflow = readFileSync(
      new URL('../.github/workflows/fork-readiness.yml', import.meta.url),
      'utf8',
    );

    assert.match(invariantWorkflow, /npm run fork:readiness:config/);
    assert.match(readinessWorkflow, /schedule:/);
    assert.match(readinessWorkflow, /node-version:\s*['"]24['"]/);
    assert.match(readinessWorkflow, /vars\.WM_HEALTH_URL/);
    assert.match(readinessWorkflow, /vars\.WM_WEB_BASE_URL/);
    assert.match(readinessWorkflow, /npm run fork:readiness/);
  });
});
