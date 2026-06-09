#!/usr/bin/env node
/**
 * Submit all healthradar24.com URLs to IndexNow after deploy.
 * Run once after deploying the IndexNow key file:
 *   node scripts/seo-indexnow-submit.mjs
 *
 * IndexNow requires all URLs in one request to share the same host.
 * Submits separate batches per subdomain.
 */

const KEY = 'a7f3e9d1b2c44e8f9a0b1c2d3e4f5a6b';

const BATCHES = [
  {
    host: 'www.healthradar24.com',
    urls: [
      'https://www.healthradar24.com/',
      'https://www.healthradar24.com/pro',
      'https://www.healthradar24.com/blog/',
      'https://www.healthradar24.com/blog/posts/what-is-worldmonitor-real-time-global-intelligence/',
      'https://www.healthradar24.com/blog/posts/five-dashboards-one-platform-worldmonitor-variants/',
      'https://www.healthradar24.com/blog/posts/track-global-conflicts-in-real-time/',
      'https://www.healthradar24.com/blog/posts/cyber-threat-intelligence-for-security-teams/',
      'https://www.healthradar24.com/blog/posts/osint-for-everyone-open-source-intelligence-democratized/',
      'https://www.healthradar24.com/blog/posts/natural-disaster-monitoring-earthquakes-fires-volcanoes/',
      'https://www.healthradar24.com/blog/posts/real-time-market-intelligence-for-traders-and-analysts/',
      'https://www.healthradar24.com/blog/posts/monitor-global-supply-chains-and-commodity-disruptions/',
      'https://www.healthradar24.com/blog/posts/satellite-imagery-orbital-surveillance/',
      'https://www.healthradar24.com/blog/posts/live-webcams-from-geopolitical-hotspots/',
      'https://www.healthradar24.com/blog/posts/prediction-markets-ai-forecasting-geopolitics/',
      'https://www.healthradar24.com/blog/posts/command-palette-search-everything-instantly/',
      'https://www.healthradar24.com/blog/posts/worldmonitor-in-21-languages-global-intelligence-for-everyone/',
      'https://www.healthradar24.com/blog/posts/ai-powered-intelligence-without-the-cloud/',
      'https://www.healthradar24.com/blog/posts/build-on-worldmonitor-developer-api-open-source/',
      'https://www.healthradar24.com/blog/posts/worldmonitor-vs-traditional-intelligence-tools/',
      'https://www.healthradar24.com/blog/posts/tracking-global-trade-routes-chokepoints-freight-costs/',
    ],
  },
  { host: 'tech.healthradar24.com', urls: ['https://tech.healthradar24.com/'] },
  { host: 'finance.healthradar24.com', urls: ['https://finance.healthradar24.com/'] },
  { host: 'happy.healthradar24.com', urls: ['https://happy.healthradar24.com/'] },
];

const ENDPOINTS = [
  'https://api.indexnow.org/IndexNow',
  'https://www.bing.com/IndexNow',
  'https://searchadvisor.naver.com/indexnow',
  'https://search.seznam.cz/indexnow',
  'https://yandex.com/indexnow',
];

async function submit(endpoint, host, urlList) {
  const keyLocation = `https://${host}/${KEY}.txt`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: KEY, keyLocation, urlList }),
  });
  return { endpoint, host, status: res.status, ok: res.ok };
}

for (const { host, urls } of BATCHES) {
  console.log(`\n[${host}] (${urls.length} URLs)`);
  const results = await Promise.allSettled(ENDPOINTS.map(ep => submit(ep, host, urls)));
  for (const r of results) {
    if (r.status === 'fulfilled') {
      console.log(`  ${r.value.ok ? '✓' : '✗'} ${r.value.endpoint.replace('https://', '')} → ${r.value.status}`);
    } else {
      console.log(`  ✗ error: ${r.reason}`);
    }
  }
}
