import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyHealthRadarHtmlBrand } from '../scripts/vite-healthradar-brand.mts';

describe('HealthRadar public brand overlay', () => {
  it('brands metadata and loading UI without rewriting upstream attribution links', () => {
    const source = `
      <title>World Monitor - Real-Time Global Intelligence Dashboard</title>
      <meta name="title" content="World Monitor - Real-Time Global Intelligence Dashboard" />
      <meta name="description" content="old description" />
      <meta property="og:title" content="old title" />
      <meta property="og:url" content="https://www.worldmonitor.app/dashboard" />
      <link rel="canonical" href="https://www.worldmonitor.app/dashboard" />
      <h1>World Monitor — Real-Time Global Intelligence Dashboard</h1>
      <div aria-label="World Monitor dashboard loading"></div>
      <span>World Monitor</span><span class="skeleton-kicker">Loading</span>
      <a href="https://github.com/koala73/worldmonitor">Upstream</a>
    `;

    const branded = applyHealthRadarHtmlBrand(source);
    assert.match(branded, /<title>HealthRadar24/);
    assert.match(branded, /https:\/\/www\.healthradar24\.com\//);
    assert.match(branded, /HealthRadar24 dashboard loading/);
    assert.match(branded, /github\.com\/koala73\/worldmonitor/);
    assert.doesNotMatch(
      branded,
      /<title>World Monitor - Real-Time Global Intelligence Dashboard<\/title>/,
    );
  });
});
