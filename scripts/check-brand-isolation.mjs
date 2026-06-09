import { spawnSync } from 'node:child_process';

const forbidden = [
  'worldmonitor.app',
  'worldmonitor.mintlify.dev',
  'ghcr.io/koala73/worldmonitor',
];

const excludedPrefixes = [
  'CHANGELOG.md:',
  'docs/Docs_To_Review/',
  'docs/audits/',
  'docs/brainstorms/',
  'docs/internal/',
  'docs/plans/',
  'docs/snapshots/',
  'plans/',
  'proto/',
  'public/pro/',
  'scripts/check-brand-isolation.mjs:',
  'todos/',
];

const result = spawnSync('git', ['grep', '-n', '-I', '-E', forbidden.join('|'), '--', '.'], {
  encoding: 'utf8',
});

if (result.status !== 0 && result.status !== 1) {
  console.error(result.stderr || 'Unable to scan repository.');
  process.exit(result.status ?? 1);
}

const violations = result.stdout
  .split('\n')
  .filter(Boolean)
  .filter((line) => !excludedPrefixes.some((prefix) => line.startsWith(prefix)));

if (violations.length > 0) {
  console.error('Upstream production references remain in active HealthRadar24 files:');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('HealthRadar24 brand isolation check passed.');
