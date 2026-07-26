import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  applyHealthRadarHtmlBrand,
  applyHealthRadarTextBrand,
} from '../pro-test/healthradar-brand.mjs';

describe('HealthRadar24 Pro fork overlay', () => {
  it('brands inherited translations without changing the upstream locale files', () => {
    assert.equal(
      applyHealthRadarTextBrand(
        'World Monitor Pro on worldmonitor.app. Email enterprise@worldmonitor.app',
      ),
      'HealthRadar24 Pro on healthradar24.com. Email https://www.healthradar24.com/support',
    );
  });

  it('removes upstream telemetry and operator metadata from generated HTML', () => {
    const source = `
      <meta name="twitter:creator" content="@worldmonitorai">
      <script src="https://abacus.worldmonitor.app/script.js"></script>
      <script type="application/ld+json">
        { "@type": "Organization", "name": "World Monitor" }
      </script>
      <title>World Monitor Pro</title>
    `;
    const branded = applyHealthRadarHtmlBrand(source);

    assert.match(branded, /HealthRadar24 Pro/);
    assert.doesNotMatch(branded, /abacus\./);
    assert.doesNotMatch(branded, /twitter:creator/);
    assert.doesNotMatch(branded, /"@type": "Organization"/);
  });

  it('builds the deployable Pro surface into dist after the main Vite build', () => {
    const pkg = JSON.parse(readFileSync(
      new URL('../package.json', import.meta.url),
      'utf8',
    ));

    assert.match(pkg.scripts.build, /vite build && npm run build:pro:dist/);
    assert.match(pkg.scripts['build:pro:dist'], /PRO_BUILD_OUT_DIR=\.\.\/dist\/pro/);
  });
});
