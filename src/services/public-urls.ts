const CANONICAL_PUBLIC_ORIGIN = 'https://www.healthradar24.com';

export interface PublicLocation {
  origin: string;
  protocol: string;
}

/**
 * Keep public product links on the active web deployment. Non-HTTP runtimes
 * (notably the Tauri webview) use the canonical hosted site instead.
 */
export function getPublicSiteOrigin(
  location: PublicLocation | undefined = globalThis.location,
): string {
  if (location && (location.protocol === 'https:' || location.protocol === 'http:')) {
    try {
      return new URL(location.origin).origin;
    } catch {
      // Fall through to the canonical hosted origin.
    }
  }
  return CANONICAL_PUBLIC_ORIGIN;
}

export function getProUrl(location?: PublicLocation): string {
  return `${getPublicSiteOrigin(location)}/pro`;
}
