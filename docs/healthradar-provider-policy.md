# HealthRadar24 provider policy

HealthRadar24 does not need every provider supported by WorldMonitor to claim a
stable fork. A provider becomes required only when it supports a capability the
product promises, has acceptable terms and reliability, and has an owned
operational fallback.

The authoritative machine-readable split is
`scripts/healthradar-readiness.json`.

## Operated baseline

| Capability | Current policy | Why |
|---|---|---|
| Vercel web and Edge API | Required | Public application and API runtime |
| Railway relay and selected seeders | Required | Long-running/provider fetch work and cache hydration |
| Upstash Redis | Required | Shared API cache, seed state, and stampede protection |
| Convex | Required for `/pro` | Inherited Pro application state |
| Clerk | Required for `/pro` authentication | Identity provider |
| Cloudflare API Worker | Required for the API domain | Fork-owned CORS preflight and edge routing |
| Core markets, weather, cyber, forecast, correlation, regional and outage feeds | Required health checks | Stable inherited situational-awareness baseline |
| Disease outbreaks and health air quality | Required health checks | First healthcare/life-science foundation |
| Stripe | Staged but disabled | Future billing; not a stability dependency |

Required does not mean every upstream seed service must run. Operate the smallest
set that satisfies the required readiness checks and product promises. Add a
service only when its absence creates a measurable capability gap.

## Provider-blocked capabilities

| Provider | Capability | Recommendation | Cost/constraint class |
|---|---|---|---|
| ACLED | Unrest events and ACLED intelligence | Keep optional until the account receives event API authorization | Authorization/terms gate; do not pay around a permission problem |
| GDELT | Unrest fallback | Keep optional until direct egress works or a reviewed CONNECT proxy is justified | Public data; proxy adds recurring bandwidth, security, and reliability cost |
| UCDP | Conflict events/bootstrap | Continue with the documented free API key where it works; approval improves reliability but is not a stable-fork blocker | Usually no direct data fee; authorization and rate limits apply |
| OpenSky | Military/aviation tracks | Keep optional while Railway egress is unreliable; credentials alone do not prove production reliability | Free allowance is useful; paid access is not justified until egress works |
| AviationStack | International delays | Do not upgrade solely for parity | Paid-plan endpoint; enable only for a committed aviation feature |
| ICAO API Data Service | NOTAM closures | Do not enable yet | Credential/terms and possible paid-access gate |
| Decodo or another CONNECT proxy | Provider egress fallback | Do not buy yet | Adds monthly spend and another trusted network hop; justify with measured user value |

The proxy exists to give Railway a different outbound network identity when a
provider blocks or degrades datacenter traffic. It is not a relay replacement,
not a cache, and not automatically required by WorldMonitor parity.

## Promotion rule

To move a provider from optional to required:

1. Confirm its terms permit the intended product and redistribution behavior.
2. Prove successful production fetches from the actual runtime for at least one
   normal freshness window.
3. Add bounded timeouts, caching, stale fallback, rate-limit handling, and a
   provider-specific health signal.
4. Document expected free-tier limits and the approved monthly budget ceiling.
5. Add it to `requiredHealthChecks` and remove it from
   `providerBlockedChecks` in the same pull request.
6. Verify bootstrap hydration when the new source is user-visible.

Removing or downgrading a provider follows the inverse process and must identify
which visible product promise is being retired.

## Cost control

Use a zero-to-low incremental-cost baseline while the product foundation is
being proven:

- stay within managed free/included allowances where terms permit;
- do not buy a proxy or aviation upgrade for dashboard completeness alone;
- keep Stripe in test mode, which has no transaction fees;
- alert before usage-based services exceed an approved ceiling;
- review Vercel, Railway, Upstash, Convex, Clerk, Cloudflare, and provider usage
  monthly;
- record current vendor prices separately from this policy because prices
  change.

Any cost estimate presented for a launch decision must be refreshed from the
providers' current official pricing pages.
