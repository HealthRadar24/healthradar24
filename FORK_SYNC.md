# HealthRadar24 upstream sync

HealthRadar24 follows `koala73/worldmonitor` closely while owning a separate
production stack. Upstream code should remain easy to merge, but upstream
operational identities must never silently become production defaults here.

The fork topology, deployment sequence, rollback procedures, environment
ownership, and launch gates are documented in
[`docs/healthradar-operations.md`](docs/healthradar-operations.md). Provider
promotion policy is documented in
[`docs/healthradar-provider-policy.md`](docs/healthradar-provider-policy.md).

## Remote roles

- `origin`: `HealthRadar24/healthradar24` — the deployable fork.
- `upstream`: `koala73/worldmonitor` — source-only; never push fork work here.

Verify them before every sync:

```bash
git remote -v
git fetch origin
git fetch upstream
```

## Sync procedure

1. Start from clean, current fork `main`.
2. Check open PRs and worktrees to avoid duplicating another sync.
3. Create a dedicated branch.
4. Merge upstream without committing, resolve conflicts, and run the fork
   invariant check before finalizing.
5. Validate in the same order as CI, then open a PR. Never sync directly to
   `main`.

```bash
git switch main
git merge --ff-only origin/main
git switch -c sync/upstream-YYYY-MM-DD
git merge --no-commit upstream/main
npm run fork:check
npm run typecheck
npm run typecheck:api
npm run test:data
```

When conflicts occur, preserve upstream application logic unless the file is
listed below as a fork-owned operational boundary. Keep conflict resolutions
small; do not combine a sync with unrelated product work.

## Fork-owned operational boundaries

These values must remain HealthRadar24-specific after every upstream merge:

- Vercel web and API domains.
- Cloudflare Worker route and zone.
- CORS canonical fallback.
- Desktop hosted-runtime fallback.
- GitHub Container Registry destination.
- Railway relay public links.
- Commerce opt-in gates and public catalog links.

`npm run fork:check` enforces the highest-risk values. The check intentionally
does not ban every `worldmonitor.app` or `koala73/worldmonitor` reference.

## Intentional upstream references

Some upstream references are expected and should not be mechanically replaced:

- Attribution, license history, issue links, and upstream documentation.
- Compatibility allowlists that continue accepting WorldMonitor origins.
- Generated OpenAPI names and `X-WorldMonitor-*` protocol headers.
- Upstream release downloads until HealthRadar24 publishes equivalent desktop
  releases.
- WorldMonitor product copy retained in inherited historical or archived docs.

If an intentional reference begins controlling production traffic, releases,
payments, authentication, or provider credentials, move it into the
fork-owned list and add an invariant before merging.

## Commerce sync rule

Upstream Dodo product IDs may remain in source for compatibility, but
HealthRadar24 commerce stays disabled unless both server and browser gates are
explicitly enabled after fork-owned products and webhooks are verified:

- `PAYMENTS_ENABLED=true`
- `VITE_PAYMENTS_ENABLED=true`

Until then, production and preview must keep both values `false`; catalog
responses must omit prices and product IDs.

## Stable-fork readiness

The inherited `/api/health` registry describes every WorldMonitor capability.
HealthRadar24 intentionally does not operate every upstream provider, so the
aggregate `HEALTHY`/`UNHEALTHY` verdict is diagnostic and is not, by itself, a
release gate for this fork.

The fork release gate is defined in
`scripts/healthradar-readiness.json` and checked by:

```bash
npm run fork:readiness:config
npm run fork:readiness
```

The first command is deterministic and runs on pull requests. The second checks
the owned HealthRadar24 web/API domains and the intentionally operated health
signals against production. GitHub runs the live check every 30 minutes through
`.github/workflows/fork-readiness.yml`.

Provider-blocked checks remain in the upstream health response and in the
readiness policy with their unblock condition. They are advisory until the
provider is deliberately enabled. When a provider becomes part of the supported
product, move its check to `requiredHealthChecks`; do not silently treat a paid
or authorization-gated provider as core.

Current provider-dependent capabilities are:

| Health check | Provider | Current disposition |
|---|---|---|
| `unrestEvents` | ACLED and GDELT | Optional; ACLED event access is 403 and GDELT needs an approved CONNECT proxy |
| `acledIntel` | ACLED | Optional until the account has event API authorization |
| `ucdpEvents`, `ucdpEventsBootstrap` | UCDP | Optional until API access and a token are approved |
| `militaryFlights` | OpenSky | Optional while Railway-to-OpenSky fetches are unreliable |
| `intlDelays` | AviationStack | Optional; do not upgrade solely for fork readiness |
| `notamClosures` | ICAO API Data Service | Optional until this feed is deliberately operated |

This separation keeps upstream observability intact while making HealthRadar24's
own stability claim precise. The initial required set includes inherited
infrastructure, markets, cyber, weather, insight, forecast, correlation and
regional pipelines, plus disease outbreaks and health air quality as the
foundation for healthcare and life-science work.
