import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCorrelationInput } from '../scripts/seed-correlation.mjs';

describe('seed-correlation input parsing', () => {
  it('unwraps contract-enveloped Redis inputs', () => {
    const payload = { earthquakes: [{ id: 'quake-1' }] };
    const raw = JSON.stringify({
      _seed: {
        fetchedAt: Date.now(),
        recordCount: 1,
        sourceVersion: 'test',
        schemaVersion: 1,
        state: 'OK',
      },
      data: payload,
    });

    assert.deepEqual(parseCorrelationInput(raw), payload);
  });

  it('preserves legacy Redis inputs', () => {
    const payload = { outages: [{ id: 'outage-1' }] };
    assert.deepEqual(parseCorrelationInput(JSON.stringify(payload)), payload);
  });

  it('ignores absent or malformed Redis values', () => {
    assert.equal(parseCorrelationInput(null), null);
    assert.equal(parseCorrelationInput('{not-json'), null);
  });
});
