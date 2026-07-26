export const HEALTHRADAR_NAME = 'HealthRadar24';
export const HEALTHRADAR_COMPANY = 'Kernelius';
export const HEALTHRADAR_ORIGIN = 'https://www.healthradar24.com';
export const HEALTHRADAR_DASHBOARD_URL = `${HEALTHRADAR_ORIGIN}/dashboard`;
export const HEALTHRADAR_SUPPORT_URL = `${HEALTHRADAR_ORIGIN}/support`;
export const HEALTHRADAR_UPSTREAM_URL = 'https://github.com/koala73/worldmonitor';
export const HEALTHRADAR_FORK_URL = 'https://github.com/yamz8/healthradar24';

const UPSTREAM_ANALYTICS_SCRIPT =
  /\s*<script\b[^>]*src="https:\/\/abacus\.worldmonitor\.app\/script\.js"[^>]*><\/script>/gi;

/**
 * Apply the fork's public identity to inherited upstream prose without
 * rewriting every translated locale. This is intentionally a narrow overlay:
 * internal protocol names, API headers and upstream attribution stay intact.
 */
export function applyHealthRadarTextBrand(value) {
  if (typeof value !== 'string') return value;

  return value
    .replaceAll('enterprise@worldmonitor.app', HEALTHRADAR_SUPPORT_URL)
    .replaceAll('support@worldmonitor.app', HEALTHRADAR_SUPPORT_URL)
    .replaceAll('https://api.worldmonitor.app', `${HEALTHRADAR_ORIGIN}/api`)
    .replaceAll('https://www.worldmonitor.app', HEALTHRADAR_ORIGIN)
    .replaceAll('https://worldmonitor.app', HEALTHRADAR_ORIGIN)
    .replaceAll('api.worldmonitor.app', 'www.healthradar24.com/api')
    .replaceAll('www.worldmonitor.app', 'www.healthradar24.com')
    .replaceAll('worldmonitor.app', 'healthradar24.com')
    .replaceAll('WORLD MONITOR', 'HEALTHRADAR24')
    .replaceAll('World Monitor', HEALTHRADAR_NAME)
    .replaceAll('WorldMonitor', HEALTHRADAR_NAME)
    .replaceAll('by Someone.ceo', `by ${HEALTHRADAR_COMPANY}`);
}

export function applyHealthRadarHtmlBrand(value) {
  const withoutUpstreamTelemetry = value
    .replace(UPSTREAM_ANALYTICS_SCRIPT, '')
    .replace(
      /\s*<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
      (script) => script.includes('"@type": "Organization"') ? '' : script,
    )
    .replace(/\s*<meta name="twitter:(?:site|creator)"[^>]*>/gi, '')
    .replace(/\s*"author":\s*\{[\s\S]*?\},\s*/g, '\n')
    .replace(/\s*"founder":\s*\{[\s\S]*?\},\s*/g, '\n');

  return applyHealthRadarTextBrand(withoutUpstreamTelemetry)
    .replaceAll('https://tech.healthradar24.com', HEALTHRADAR_ORIGIN)
    .replaceAll('https://finance.healthradar24.com', HEALTHRADAR_ORIGIN)
    .replaceAll('https://commodity.healthradar24.com', HEALTHRADAR_ORIGIN)
    .replaceAll('https://energy.healthradar24.com', HEALTHRADAR_ORIGIN)
    .replaceAll('https://happy.healthradar24.com', HEALTHRADAR_ORIGIN);
}
