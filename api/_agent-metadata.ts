/**
 * Shared helpers for the host-derived agent-readiness discovery documents:
 * the RFC 9728 protected-resource metadata (`oauth-protected-resource.ts`) and
 * the RFC 8414 authorization-server metadata (`oauth-authorization-server.ts`).
 *
 * Both derive their `resource`/`issuer` + endpoint origin from the request Host
 * so PRM and AS metadata stay self-consistent per host (apex, www, api, variant
 * subdomains). The Host header is client-controlled, so `resolveMetadataOrigin`
 * validates it against the configured public apex + single-level subdomain
 * allowlist and falls back to the configured public origin. Without this, a
 * spoofed `Host: evil.com` would be reflected into `issuer`/`token_endpoint` —
 * metadata a non-Host-aware downstream cache could serve to an agent, pointing
 * its token exchange at an attacker origin.
 */

const DEFAULT_PUBLIC_ORIGIN = 'https://worldmonitor.app';

function metadataDomainConfig(): { apex: string; fallbackOrigin: string } {
  const configured = process.env.WORLDMONITOR_PUBLIC_BASE_URL ?? DEFAULT_PUBLIC_ORIGIN;
  try {
    const url = new URL(configured);
    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || url.port
      || url.pathname !== '/'
      || url.search
      || url.hash
    ) {
      throw new Error('invalid public origin');
    }
    const hostname = url.hostname.toLowerCase();
    const apex = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    return { apex, fallbackOrigin: `https://${hostname}` };
  } catch {
    return { apex: 'worldmonitor.app', fallbackOrigin: DEFAULT_PUBLIC_ORIGIN };
  }
}

export function resolveMetadataOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = (req.headers.get('host') ?? url.host).toLowerCase();
  const { apex, fallbackOrigin } = metadataDomainConfig();
  const labels = host.split('.');
  const allowed = host === apex
    || (labels.length === apex.split('.').length + 1 && host.endsWith(`.${apex}`));
  return allowed ? `https://${host}` : fallbackOrigin;
}

/**
 * These documents are read-only. Answer CORS preflights, allow GET/HEAD, and
 * reject everything else with a spec-correct 405 + Allow. Returns null when the
 * request should proceed to the metadata handler.
 */
export function guardMetadataMethod(req: Request): Response | null {
  if (req.method === 'GET' || req.method === 'HEAD') return null;
  const cors: Record<string, string> = { 'Access-Control-Allow-Origin': '*' };
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' },
    });
  }
  return new Response(null, { status: 405, headers: { ...cors, Allow: 'GET, HEAD, OPTIONS' } });
}
