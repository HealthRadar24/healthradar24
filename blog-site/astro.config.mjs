// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const POST_DATES = {
  'https://www.healthradar24.com/blog/posts/ai-powered-intelligence-without-the-cloud/': '2026-03-07',
  'https://www.healthradar24.com/blog/posts/build-on-worldmonitor-developer-api-open-source/': '2026-03-09',
  'https://www.healthradar24.com/blog/posts/command-palette-search-everything-instantly/': '2026-03-06',
  'https://www.healthradar24.com/blog/posts/cyber-threat-intelligence-for-security-teams/': '2026-02-24',
  'https://www.healthradar24.com/blog/posts/five-dashboards-one-platform-worldmonitor-variants/': '2026-02-12',
  'https://www.healthradar24.com/blog/posts/live-webcams-from-geopolitical-hotspots/': '2026-03-01',
  'https://www.healthradar24.com/blog/posts/monitor-global-supply-chains-and-commodity-disruptions/': '2026-02-26',
  'https://www.healthradar24.com/blog/posts/natural-disaster-monitoring-earthquakes-fires-volcanoes/': '2026-02-19',
  'https://www.healthradar24.com/blog/posts/osint-for-everyone-open-source-intelligence-democratized/': '2026-02-17',
  'https://www.healthradar24.com/blog/posts/prediction-markets-ai-forecasting-geopolitics/': '2026-03-03',
  'https://www.healthradar24.com/blog/posts/real-time-market-intelligence-for-traders-and-analysts/': '2026-02-21',
  'https://www.healthradar24.com/blog/posts/satellite-imagery-orbital-surveillance/': '2026-02-28',
  'https://www.healthradar24.com/blog/posts/track-global-conflicts-in-real-time/': '2026-02-14',
  'https://www.healthradar24.com/blog/posts/tracking-global-trade-routes-chokepoints-freight-costs/': '2026-03-15',
  'https://www.healthradar24.com/blog/posts/what-is-worldmonitor-real-time-global-intelligence/': '2026-02-10',
  'https://www.healthradar24.com/blog/posts/worldmonitor-in-21-languages-global-intelligence-for-everyone/': '2026-03-04',
  'https://www.healthradar24.com/blog/posts/worldmonitor-vs-traditional-intelligence-tools/': '2026-03-11',
  'https://www.healthradar24.com/blog/': '2026-03-19',
};

export default defineConfig({
  site: 'https://www.healthradar24.com',
  base: '/blog',
  output: 'static',
  integrations: [
    sitemap({
      serialize(item) {
        const lastmod = POST_DATES[item.url];
        if (lastmod) return { ...item, lastmod };
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
