#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PROFILE_URL = new URL('./healthradar-railway-profile.json', import.meta.url);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

export function validateRailwayProfile(profile) {
  assertObject(profile, 'Railway profile');
  if (profile.schemaVersion !== 1) throw new Error('Railway profile schemaVersion must be 1');
  if (typeof profile.environment !== 'string' || profile.environment.length === 0) {
    throw new Error('Railway profile environment must be a non-empty string');
  }
  if (!Array.isArray(profile.connectedServices) || profile.connectedServices.length === 0) {
    throw new Error('Railway profile connectedServices must be a non-empty array');
  }

  const names = new Set();
  for (const service of profile.connectedServices) {
    assertObject(service, 'Railway profile connected service');
    for (const field of ['name', 'repository', 'branch']) {
      if (typeof service[field] !== 'string' || service[field].length === 0) {
        throw new Error(`Railway profile connected service ${field} must be a non-empty string`);
      }
    }
    if (names.has(service.name)) {
      throw new Error(`Railway profile contains duplicate connected service ${service.name}`);
    }
    names.add(service.name);
    if (service.cronSchedule !== null && typeof service.cronSchedule !== 'string') {
      throw new Error(`Railway profile ${service.name} cronSchedule must be a string or null`);
    }
  }

  assertObject(profile.pausedServices, 'Railway profile pausedServices');
  if (!Array.isArray(profile.pausedServices.namePrefixes)
      || profile.pausedServices.namePrefixes.length === 0
      || profile.pausedServices.namePrefixes.some(
        (prefix) => typeof prefix !== 'string' || prefix.length === 0,
      )) {
    throw new Error('Railway profile pausedServices.namePrefixes must contain strings');
  }
  if (profile.pausedServices.sourceConnected !== false) {
    throw new Error('Railway profile pausedServices.sourceConnected must be false');
  }
  if (profile.pausedServices.cronSchedule !== null) {
    throw new Error('Railway profile pausedServices.cronSchedule must be null');
  }
}

function sourceRepository(service) {
  const repository = service?.source?.repo;
  return typeof repository === 'string' && repository.length > 0 ? repository : null;
}

function cronSchedule(service) {
  const schedule = service?.deploy?.cronSchedule;
  return typeof schedule === 'string' && schedule.length > 0 ? schedule : null;
}

export function evaluateRailwayProfile(profile, serviceList, environmentConfig) {
  validateRailwayProfile(profile);
  if (!Array.isArray(serviceList)) throw new Error('Railway service list must be an array');
  assertObject(environmentConfig, 'Railway environment config');
  assertObject(environmentConfig.services, 'Railway environment config services');

  const failures = [];
  const expectedByName = new Map(
    profile.connectedServices.map((service) => [service.name, service]),
  );
  const seenExpected = new Set();
  let pausedCount = 0;

  for (const liveService of serviceList) {
    const { id, name } = liveService;
    if (typeof id !== 'string' || typeof name !== 'string') {
      failures.push('Railway returned a service without a stable id and name');
      continue;
    }
    const config = environmentConfig.services[id];
    if (!config) {
      failures.push(`${name} is absent from the production environment config`);
      continue;
    }

    const expected = expectedByName.get(name);
    if (expected) {
      seenExpected.add(name);
      const actualRepository = sourceRepository(config);
      const actualBranch = config?.source?.branch ?? null;
      const actualCron = cronSchedule(config);
      if (actualRepository !== expected.repository) {
        failures.push(
          `${name} repository is ${JSON.stringify(actualRepository)}; `
          + `expected ${JSON.stringify(expected.repository)}`,
        );
      }
      if (actualBranch !== expected.branch) {
        failures.push(
          `${name} branch is ${JSON.stringify(actualBranch)}; `
          + `expected ${JSON.stringify(expected.branch)}`,
        );
      }
      if (actualCron !== expected.cronSchedule) {
        failures.push(
          `${name} cron is ${JSON.stringify(actualCron)}; `
          + `expected ${JSON.stringify(expected.cronSchedule)}`,
        );
      }
      continue;
    }

    const isPaused = profile.pausedServices.namePrefixes
      .some((prefix) => name.startsWith(prefix));
    if (!isPaused) {
      failures.push(`${name} is not classified by the HealthRadar Railway profile`);
      continue;
    }
    pausedCount += 1;
    const repository = sourceRepository(config);
    const schedule = cronSchedule(config);
    if (repository !== null) {
      failures.push(`${name} is deferred but remains source-connected to ${repository}`);
    }
    if (schedule !== null) {
      failures.push(`${name} is deferred but has cron ${JSON.stringify(schedule)}`);
    }
  }

  for (const expected of profile.connectedServices) {
    if (!seenExpected.has(expected.name)) {
      failures.push(`${expected.name} is missing from Railway ${profile.environment}`);
    }
  }

  return {
    failures,
    connectedCount: seenExpected.size,
    pausedCount,
  };
}

function runRailway(args) {
  const result = spawnSync('railway', args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `railway ${args.join(' ')} failed (${result.status}): ${result.stderr.trim()}`,
    );
  }
  return JSON.parse(result.stdout);
}

function main() {
  const profile = JSON.parse(readFileSync(PROFILE_URL, 'utf8'));
  validateRailwayProfile(profile);
  if (process.argv.includes('--config-only')) {
    console.log('HealthRadar Railway profile config passed.');
    return;
  }

  const serviceList = runRailway(['service', 'list', '--json']);
  const environmentConfig = runRailway([
    'environment',
    'config',
    '--environment',
    profile.environment,
    '--json',
  ]);
  const result = evaluateRailwayProfile(profile, serviceList, environmentConfig);
  if (result.failures.length > 0) {
    console.error('HealthRadar Railway profile failed:');
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `HealthRadar Railway profile passed: ${result.connectedCount} connected service(s), `
    + `${result.pausedCount} deferred service(s).`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
