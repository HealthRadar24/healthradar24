# HealthRadar24 Production Deployment

This repository is deployed as an independent Vercel and Railway installation. Do not connect it to upstream World Monitor production resources.

## Domain Topology

Attach these domains to the single Vercel project:

- `healthradar24.com`
- `www.healthradar24.com`
- `tech.healthradar24.com`
- `finance.healthradar24.com`
- `commodity.healthradar24.com`
- `happy.healthradar24.com`
- `energy.healthradar24.com`
- `api.healthradar24.com`

GoDaddy currently owns DNS for `healthradar24.com` through the
`ns63.domaincontrol.com` and `ns64.domaincontrol.com` nameservers. Point the
root and variant hosts at Vercel there. Route `api.healthradar24.com/*` through
the Worker in `workers/api-cors-preflight` only after moving the zone to
Cloudflare; until then, deploy the Worker on workers.dev with
`wrangler.workers-dev.toml` or send the API hostname directly to Vercel.

## Isolated Resources

Create dedicated projects or databases for:

| Resource | Required configuration |
| --- | --- |
| GitHub | Public `HealthRadar24/healthradar24` repository and Actions secrets |
| Vercel | Production project connected to `main`; all domains above |
| Railway | Relay, registered workers/seed bundles, then standalone cron services |
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Convex | `CONVEX_DEPLOY_KEY`, `CONVEX_URL`, `CONVEX_SITE_URL`, `VITE_CONVEX_URL` |
| Cloudflare | DNS zone, Worker token/account ID, optional R2 buckets |
| Clerk | Publishable/secret keys, issuer, callbacks for HealthRadar24 domains |
| Observability | Dedicated Sentry DSN and Axiom token |
| Messaging/payments | Dedicated Resend, Dodo, Slack, Discord, Telegram, and webhook credentials as enabled |

Use `.env.example` as the variable inventory. Store production values only in provider secret stores. Never commit exported Vercel or Railway environments.

## Deployment Order

1. Create the GitHub repository and push `main`.
2. Create Upstash and Convex production resources.
3. Import the repository into Vercel, set secrets, attach domains, and verify `/api/health`.
4. Deploy the Railway relay with `RELAY_SHARED_SECRET`, Redis credentials, and provider keys.
5. Deploy the health-critical and high-frequency seed bundles from `scripts/railway-services.json`.
6. Wait for two scheduled runs and verify seed freshness through `/api/health`.
7. Deploy the remaining registered services, then standalone crons from `docs/railway-seed-consolidation-runbook.md`.
8. Deploy the Cloudflare CORS Worker and run its live preflight smoke test. If
   the zone remains on GoDaddy, deploy with
   `npx wrangler deploy --config workers/api-cors-preflight/wrangler.workers-dev.toml`
   and keep `api.healthradar24.com` pointed directly at Vercel.
9. Enable optional provider integrations only when valid credentials are available.

## Release Gates

Run before production promotion:

```bash
npm run security:brand-isolation
npm run typecheck:all
npm run test:data
npm run test:sidecar
npm run test:convex
npm run test:resilience-validation-smoke
npm run build:full
```

Production is stable when all domains have valid TLS, variant routing is correct, API and relay authentication succeed, and seed health remains current for two complete cron cycles.

## Upstream Updates

The remotes must remain:

```text
origin   https://github.com/HealthRadar24/healthradar24.git
upstream https://github.com/koala73/worldmonitor.git
```

Start an update with `scripts/sync-upstream.sh`. Resolve conflicts in favor of HealthRadar24 domains, branding, secrets, and deployment resources. Merge the sync branch through a reviewed pull request after preview validation.
