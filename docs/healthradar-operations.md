# HealthRadar24 operations

This is the fork-owned production runbook. The inherited WorldMonitor
documentation remains the architecture reference; this document identifies
which systems HealthRadar24 operates and where the fork deliberately differs.

## Production topology

| Surface | Owner | Purpose | Deployment trigger |
|---|---|---|---|
| Vercel `healthradar24` | Kernelius | SPA, `/pro`, Edge APIs, static trust pages | Git integration after a branch or `main` update |
| Convex | Kernelius | Authentication-adjacent application state and the inherited Pro backend | `Convex Deploy` after `convex/` changes reach `main` |
| Railway `ais-relay` | Kernelius | Long-running relay and network/provider work unsuitable for Vercel Edge | Railway Git deployment |
| Railway seed services | Kernelius | Capability-driven cache hydration; paused until a selected product feature requires the corresponding feed | Railway Git deployment or schedule |
| Upstash Redis | Kernelius | Shared API/relay cache and seed state | Managed integration; no code deployment |
| Cloudflare Worker | Kernelius | CORS preflight at `api.healthradar24.com` | `Deploy API CORS Worker` after Worker changes reach `main` |
| GitHub Actions | HealthRadar24 repository | CI, fork invariants, readiness, Convex and Worker deployment | Pull request, `main`, schedule, or manual dispatch |
| Clerk | Kernelius | Browser authentication for `/pro` | Managed service plus Vercel public/secret environment variables |
| Stripe | Kernelius | Future billing provider | Disabled until the commercial launch gate passes |

Do not add a second relay merely to match a product label. The existing
`ais-relay` process already performs the upstream relay role. Service names may
be aligned in the hosting dashboard when useful, but topology and behavior—not
duplicate compute—define parity.

## Environment ownership

Never commit, print, or copy secret values into documentation. Environment
variable names are safe to document.

| Variable family | Production | Preview | Railway | Notes |
|---|---:|---:|---:|---|
| `VITE_CLERK_PUBLISHABLE_KEY` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Required | Required | No | Public build value; the build accepts either name |
| `CLERK_SECRET_KEY` | Required for server auth | Required when preview auth is exercised | No | Secret |
| `VITE_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL`, or `CONVEX_URL` | Required | Required | As required by a seeder | Public deployment URL; the build accepts these aliases |
| `CONVEX_DEPLOY_KEY` | CI/deployment only | Optional | No | Secret; never expose through `VITE_*` |
| `CONVEX_SERVER_SHARED_SECRET` | Required by inherited server integration | Required for full preview testing | As required | Secret |
| `UPSTASH_REDIS_REST_URL` | Required | Required | Required for cache-writing services | URL is sensitive operational configuration |
| `UPSTASH_REDIS_REST_TOKEN` | Required | Required | Required for cache-writing services | Secret |
| `WORLDMONITOR_RELAY_KEY` | Required | Required when preview relay calls are tested | Required on relay | Same dedicated value on callers and relay |
| `PAYMENTS_ENABLED` | Must be `false` | Must be `false` | Must be `false` or absent | Server kill switch |
| `VITE_PAYMENTS_ENABLED` | Must be `false` | Must be `false` | No | Browser kill switch |
| `STRIPE_*` | May be staged in test mode | May be staged in test mode | Normally no | Presence never enables commerce |

Current known configuration gate: Vercel Preview must expose a public Convex
deployment URL through one of the accepted names above. Production values pulled
through Vercel CLI may be masked and must not be treated as transferable secret
material.

## Readiness classes

The live readiness workflow separates platform stability from inherited data
coverage:

- `requiredHealthChecks` are promoted product promises. An unhealthy required
  check fails the release gate.
- `deferredHealthChecks` are governed capabilities whose services are
  intentionally not operated yet. They remain visible without failing the
  platform gate.
- `providerBlockedChecks` require external authorization, credentials, terms,
  or network access. They remain visible with an explicit unblock condition.
- all other upstream health problems are advisory.

Even with no promoted data feed, readiness fails when Redis is unavailable, the
health registry shrinks below its integrity floor, the health snapshot is stale,
the deployed product identity is wrong, Clerk is absent from the browser build,
or commerce gates differ from the approved disabled state.

## Release sequence

1. Work on a branch based on the fork's current `main`.
2. Check for duplicate pull requests and worktrees.
3. Run the deterministic fork gates:

   ```bash
   npm run fork:check
   npm run fork:readiness:config
   npm run typecheck
   npm run typecheck:api
   ```

4. Run change-scoped tests and `npm run build`. Heavy checks run sequentially.
5. Push and open a pull request. Review the Vercel Preview deployment.
6. Verify Preview identity, Clerk sign-in/sign-out, Convex-backed routes, API
   health, and that commerce remains disabled.
7. Merge only after explicit user approval and green required checks.
8. Observe Vercel, Convex, Railway, Cloudflare, and the live fork-readiness
   workflow after `main` deploys.

The machine-readable release policy is
`scripts/healthradar-readiness.json`. Both the main build and `/pro` publish a
non-secret readiness manifest that the live checker validates.

## Rollback

| System | Rollback action |
|---|---|
| Vercel | Promote the last known-good deployment or revert the offending commit |
| Convex | Redeploy the previous compatible function revision; schema changes must remain backward compatible |
| Railway | Roll back the affected service deployment; do not roll back unrelated seeders |
| Cloudflare | Redeploy the last known-good Worker commit or disable its route only during an active routing incident |
| Stripe | Keep both payment gates false; webhook failures must never require taking the intelligence dashboard offline |

After rollback, run the live readiness check and record the failed health signal.
Do not conceal a provider outage by removing it from the upstream registry.

## Commercial launch gate

Payments remain disabled until all of these are true:

- Vercel is on a plan that permits the intended commercial workload.
- A provider-neutral billing boundary exists and the inherited Dodo path remains
  sync-compatible.
- Stripe test products, prices, Checkout, Customer Portal, and signed webhooks
  pass end-to-end tests.
- Webhook processing is idempotent and entitlement changes are auditable.
- Terms, privacy, support, refund/cancellation policy, operator identity, tax
  handling, pricing, and customer communications are approved.
- Migration and rollback procedures have been rehearsed with test users.
- The user explicitly approves setting both payment gates to `true`.

Until that approval, pricing surfaces must not expose live product IDs or accept
payments.

The detailed staged procedure is
[`healthradar-commercial-launch.md`](healthradar-commercial-launch.md).

## Healthcare launch boundary

The initial healthcare foundation governs disease outbreaks and environmental
health/air quality because those feeds already fit the inherited situational
awareness model. Their operating cadences remain deferred until a committed
workspace promotes them. New healthcare sources must document:

- provenance, update cadence, licensing, and geographical scope;
- whether the data is public, aggregate, de-identified, or personal;
- validation and correction behavior;
- clinical limitations and a clear non-medical-advice statement;
- cache keys, freshness checks, bootstrap hydration, and provider fallback.

Do not ingest protected health information or position an intelligence signal as
diagnosis, treatment, or emergency guidance without a separate compliance and
clinical governance project.

## Upstream sync

Use [FORK_SYNC.md](../FORK_SYNC.md). Keep upstream application changes close to
their original shape and place fork behavior in small overlays, configuration,
and invariant checks. Every newly discovered production identity boundary must
be added to `scripts/check-fork-invariants.mjs`.
