import type { Plugin } from 'vite';

const TITLE = 'HealthRadar24 — Real-Time Health, Life Science & Global Risk Intelligence';
const DESCRIPTION = 'HealthRadar24 combines disease outbreaks, environmental health, healthcare and life-science signals with global events, markets, infrastructure and supply chains.';
const ORIGIN = 'https://www.healthradar24.com';

function replaceMetaContent(html: string, selector: string, value: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(
    new RegExp(`(<meta[^>]+${escaped}[^>]+content=")[^"]*(")`, 'i'),
    `$1${value}$2`,
  );
}

export function applyHealthRadarHtmlBrand(source: string): string {
  let html = source
    .replace(/<title>[^<]*<\/title>/i, `<title>${TITLE}</title>`)
    .replace(
      /<link rel="canonical" href="https:\/\/www\.worldmonitor\.app\/dashboard"\s*\/>/i,
      `<link rel="canonical" href="${ORIGIN}/" />`,
    )
    .replace(
      /<link rel="alternate" hreflang="x-default" href="https:\/\/www\.worldmonitor\.app\/dashboard"\s*\/>/i,
      `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/" />`,
    )
    .replaceAll(
      'World Monitor — Real-Time Global Intelligence Dashboard',
      TITLE,
    )
    .replaceAll(
      'World Monitor - Real-Time Global Intelligence Dashboard',
      TITLE,
    )
    .replaceAll('World Monitor dashboard loading', 'HealthRadar24 dashboard loading')
    .replaceAll(
      '<span>World Monitor</span><span class="skeleton-kicker">',
      '<span>HealthRadar24</span><span class="skeleton-kicker">',
    )
    .replaceAll('"name": "World Monitor"', '"name": "HealthRadar24"')
    .replaceAll('"alternateName": ["WorldMonitor", "World Monitor App", "WM Intelligence"]', '"alternateName": ["HealthRadar", "Health Radar 24", "HealthRadar24 by Kernelius"]')
    .replaceAll('"url": "https://www.worldmonitor.app/dashboard"', `"url": "${ORIGIN}/"`)
    .replaceAll('"url": "https://www.worldmonitor.app/"', `"url": "${ORIGIN}/"`)
    .replace(/\s*"email": "support@worldmonitor\.app",?\n/g, '\n');

  html = replaceMetaContent(html, 'name="title"', TITLE);
  html = replaceMetaContent(html, 'name="description"', DESCRIPTION);
  html = replaceMetaContent(html, 'name="application-name"', 'HealthRadar24');
  html = replaceMetaContent(html, 'property="og:title"', TITLE);
  html = replaceMetaContent(html, 'property="og:description"', DESCRIPTION);
  html = replaceMetaContent(html, 'property="og:url"', `${ORIGIN}/`);
  html = replaceMetaContent(html, 'property="og:site_name"', 'HealthRadar24');
  html = replaceMetaContent(html, 'name="twitter:title"', TITLE);
  html = replaceMetaContent(html, 'name="twitter:description"', DESCRIPTION);
  html = replaceMetaContent(html, 'name="twitter:url"', `${ORIGIN}/`);

  return html;
}

/**
 * Keep the large, frequently changing upstream HTML document mergeable while
 * applying the fork's public identity to every Vite-generated HTML entry.
 */
export function healthRadarBrandPlugin(): Plugin {
  return {
    name: 'healthradar-public-brand',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler: applyHealthRadarHtmlBrand,
    },
  };
}
