import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  evaluateRailwayProfile,
  validateRailwayProfile,
} from '../scripts/check-healthradar-railway-profile.mjs';

const profile = JSON.parse(readFileSync(
  new URL('../scripts/healthradar-railway-profile.json', import.meta.url),
  'utf8',
));

function liveConfig({
  relayRepository = 'HealthRadar24/healthradar24',
  relayBranch = 'main',
  seedRepository = null,
  seedCron = null,
} = {}) {
  return {
    services: {
      relayId: {
        source: { repo: relayRepository, branch: relayBranch },
        deploy: { cronSchedule: null },
      },
      seedId: {
        source: { repo: seedRepository, branch: seedRepository ? 'main' : null },
        deploy: { cronSchedule: seedCron },
      },
    },
  };
}

const serviceList = [
  { id: 'relayId', name: 'relay' },
  { id: 'seedId', name: 'seed-bundle-health' },
];

describe('HealthRadar Railway profile', () => {
  it('pins the relay and keeps the inherited seed fleet paused', () => {
    validateRailwayProfile(profile);
    const result = evaluateRailwayProfile(profile, serviceList, liveConfig());

    assert.deepEqual(result, {
      failures: [],
      connectedCount: 1,
      pausedCount: 1,
    });
  });

  it('fails when a deferred seeder is reconnected or scheduled', () => {
    const result = evaluateRailwayProfile(profile, serviceList, liveConfig({
      seedRepository: 'HealthRadar24/healthradar24',
      seedCron: '0 * * * *',
    }));

    assert.match(result.failures.join('\n'), /remains source-connected/);
    assert.match(result.failures.join('\n'), /has cron/);
  });

  it('fails on relay identity drift and unclassified services', () => {
    const result = evaluateRailwayProfile(
      profile,
      [...serviceList, { id: 'workerId', name: 'extra-worker' }],
      {
        ...liveConfig({ relayRepository: 'koala73/worldmonitor', relayBranch: 'develop' }),
        services: {
          ...liveConfig({
            relayRepository: 'koala73/worldmonitor',
            relayBranch: 'develop',
          }).services,
          workerId: { source: { repo: null }, deploy: { cronSchedule: null } },
        },
      },
    );

    assert.match(result.failures.join('\n'), /relay repository/);
    assert.match(result.failures.join('\n'), /relay branch/);
    assert.match(result.failures.join('\n'), /extra-worker is not classified/);
  });
});
