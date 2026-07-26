import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('HealthRadar24 public trust surfaces', () => {
  it('routes support and legal aliases to fork-owned static pages', () => {
    const config = JSON.parse(read('vercel.json'));
    const redirects = new Map(config.redirects.map(({ source, destination }) => [
      source,
      destination,
    ]));

    assert.equal(redirects.get('/support'), '/healthradar/support.html');
    assert.equal(redirects.get('/privacy'), '/healthradar/privacy.html');
    assert.equal(redirects.get('/terms'), '/healthradar/terms.html');
    assert.ok(config.rewrites.some((rewrite) => (
      rewrite.source === '/'
      && rewrite.destination === '/pro/welcome.html'
      && rewrite.has?.some(({ value }) => value.includes('healthradar24'))
    )));
  });

  it('publishes HealthRadar identity and safe healthcare guidance', () => {
    for (const path of [
      'public/healthradar/support.html',
      'public/healthradar/privacy.html',
      'public/healthradar/terms.html',
    ]) {
      const source = read(path);
      assert.match(source, /HealthRadar24/);
      assert.doesNotMatch(source, /support@worldmonitor|enterprise@worldmonitor/);
    }

    const privacy = read('public/healthradar/privacy.html');
    const terms = read('public/healthradar/terms.html');
    assert.match(privacy, /Do not submit patient-identifiable or protected health information/);
    assert.match(terms, /not medical advice/i);
    assert.match(terms, /payments are currently disabled/i);
  });

  it('keeps vulnerability reports inside the HealthRadar organization', () => {
    const securityTxt = read('public/.well-known/security.txt');
    assert.match(securityTxt, /github\.com\/HealthRadar24\/healthradar24\/security\/advisories/);
    assert.match(securityTxt, /www\.healthradar24\.com\/\.well-known\/security\.txt/);
    assert.doesNotMatch(securityTxt, /worldmonitor\.app|elie@/);
  });
});
