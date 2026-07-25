import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getProUrl, getPublicSiteOrigin } from '../src/services/public-urls.ts';

describe('public product URLs', () => {
  it('keeps product links on the active HTTPS deployment', () => {
    const location = {
      origin: 'https://www.healthradar24.com',
      protocol: 'https:',
    };

    assert.equal(getPublicSiteOrigin(location), 'https://www.healthradar24.com');
    assert.equal(getProUrl(location), 'https://www.healthradar24.com/pro');
  });

  it('preserves upstream behavior on the upstream deployment', () => {
    assert.equal(getProUrl({
      origin: 'https://www.worldmonitor.app',
      protocol: 'https:',
    }), 'https://www.worldmonitor.app/pro');
  });

  it('uses the canonical hosted site for non-HTTP desktop runtimes', () => {
    assert.equal(getProUrl({
      origin: 'tauri://localhost',
      protocol: 'tauri:',
    }), 'https://worldmonitor.app/pro');
  });

  it('rejects malformed HTTP origins', () => {
    assert.equal(getProUrl({
      origin: 'not a URL',
      protocol: 'https:',
    }), 'https://worldmonitor.app/pro');
  });
});
