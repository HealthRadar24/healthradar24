const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

/**
 * Use the current deployment by default so forks keep authentication,
 * checkout, and catalog requests within their own infrastructure.
 *
 * Upstream can still target a dedicated API hostname by setting
 * VITE_API_BASE_URL at build time.
 */
export const API_BASE = (configuredApiBase || '/api').replace(/\/+$/, '');
