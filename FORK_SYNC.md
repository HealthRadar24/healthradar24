# HealthRadar24 upstream sync

HealthRadar24 follows `koala73/worldmonitor` closely while owning a separate
production stack. Upstream code should remain easy to merge, but upstream
operational identities must never silently become production defaults here.

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
