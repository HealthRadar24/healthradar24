export interface HealthRadarClientEnv {
  VITE_CLERK_PUBLISHABLE_KEY?: string;
  VITE_CONVEX_URL?: string;
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

/**
 * Normalize public client configuration emitted by provider integrations.
 *
 * Clerk's Vercel integration commonly emits NEXT_PUBLIC_* while this inherited
 * Vite application reads VITE_*. Convex may expose its public deployment URL
 * as CONVEX_URL. Only explicitly public identifiers/URLs are mapped here;
 * secrets and server credentials must never cross into Vite client variables.
 */
export function resolveHealthRadarClientEnv(
  env: Record<string, string | undefined>,
): HealthRadarClientEnv {
  return {
    VITE_CLERK_PUBLISHABLE_KEY: firstNonEmpty(
      env.VITE_CLERK_PUBLISHABLE_KEY,
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    ),
    VITE_CONVEX_URL: firstNonEmpty(
      env.VITE_CONVEX_URL,
      env.NEXT_PUBLIC_CONVEX_URL,
      env.CONVEX_URL,
    ),
  };
}

export function applyHealthRadarClientEnvAliases(
  loadedEnv: Record<string, string | undefined>,
  target: Record<string, string | undefined> = process.env,
): HealthRadarClientEnv {
  const resolved = resolveHealthRadarClientEnv({ ...target, ...loadedEnv });
  for (const [name, value] of Object.entries(resolved)) {
    if (!value) continue;
    loadedEnv[name] = value;
    target[name] = value;
  }
  return resolved;
}

