# HealthRadar24 open-source healthcare and life-science charter

HealthRadar24 is an open-source healthcare and life-science intelligence
platform. It aggregates public health, environmental-health, clinical-research,
regulatory, and biomedical-literature signals, and places them next to the
global events, infrastructure, and supply chains that shape health risk.

This document is the project charter: what the project is, which data domains
it accepts, which uses it refuses, how the code is licensed, and how an outside
contributor gets a new healthcare or life-science source shipped.

The machine-readable form of this charter is
`shared/healthradar-health-sources.json`. Every rule below that can be checked
mechanically is checked by:

```bash
npm run health:governance
node scripts/check-fork-invariants.mjs
npm run test:data -- tests/healthradar-open-source-governance.test.mjs
```

## What the project is

- An **intelligence and research** platform for population-level health and
  life-science signals.
- **Open source** under AGPL-3.0-only, including the server-side deployment
  obligations that license carries. Self-hosting is a first-class use case, not
  a tolerated one — see [SELF_HOSTING.md](../SELF_HOSTING.md).
- A **fork of [WorldMonitor](https://github.com/koala73/worldmonitor)** that
  keeps upstream's architecture and sync path. Upstream authorship is credited,
  and the fork's own operational identity is enforced by
  `scripts/check-fork-invariants.mjs`. Sync procedure:
  [FORK_SYNC.md](../FORK_SYNC.md).

## What the project is not

These are hard boundaries, encoded in `productBoundary` in the source policy.
A contribution that crosses one will be closed rather than revised.

- **Not a medical device** and not a clinical decision support system.
- **Not medical advice**, diagnosis, treatment, triage, or emergency guidance.
  Every health surface renders `PRODUCT_BRAND.healthSignalDisclaimer`.
- **No protected health information.** The platform does not ingest, store, or
  accept patient records, patient identifiers, symptom reports, genomic data
  about identifiable individuals, or any other PHI. There is no consent basis
  for it and no compliance program behind it.
- **No clinical classification laundering.** Editorial severity labels
  (`alert`, `warning`, `watch`) are keyword classifiers. They must never be
  presented as a WHO, ECDC, or regulator risk assessment.
- **No collapsing of secondary reporting into primary-source claims.** Item
  provenance is per item, and news aggregation stays labelled as such.

## Governed domains

Seven domains are in scope. Each domain fixes the kind of source that is
acceptable inside it; anything outside them needs a charter change, not a
source review.

| Domain id | Covers | Primary source classes |
|---|---|---|
| `publicHealthSurveillance` | Outbreak advisories, epidemic case and death trends, vaccine-preventable disease, immunisation coverage | WHO, ECDC, CDC, PAHO, national public-health agencies |
| `environmentalHealth` | Air quality, heat, water quality, and radiation exposure as population health screening signals | OpenAQ, WAQI, WHO guideline thresholds, national environment agencies |
| `pathogenGenomics` | Pathogen lineage and variant surveillance at population level | Nextstrain open builds, WHO Weekly Epidemiological Record, public consortium summaries |
| `clinicalResearch` | Registered trial starts, status changes, and posted results | ClinicalTrials.gov, WHO ICTRP, EU CTIS, ISRCTN |
| `regulatoryAndSafety` | Approvals, recalls, safety communications, adverse-event signal summaries | openFDA, EMA, MHRA, national regulators |
| `biomedicalLiterature` | Peer-reviewed publications and clearly labelled preprints | Europe PMC, PubMed, medRxiv, bioRxiv, journal feeds |
| `healthSupplyChain` | Drug and device shortages, plus manufacturing and logistics disruption context | FDA and EMA shortage databases, regulator notices, inherited logistics layers |

## Capability tiers

A domain says what is acceptable. A **capability** is a concrete data product
inside a domain, and it sits in exactly one of three tiers.

| Tier | Meaning | Where it lives |
|---|---|---|
| `required_baseline` | Plumbed, cadence enabled, freshness gated, and required to be healthy in production | `capabilities[]` plus `requiredHealthChecks` in `scripts/healthradar-readiness.json` |
| `deferred_candidate` | Fully plumbed — contracts, seeds, health registry, tests — with its cadence intentionally paused | `capabilities[]` plus `deferredHealthChecks` |
| `roadmap_candidate` | Accepted into scope with sources and gates declared, but not yet plumbed | `roadmapCapabilities[]` only |

Tiers only move in one direction without a governance review:
`roadmap_candidate` → `deferred_candidate` → `required_baseline`. Governance
rejects a roadmap capability that is listed as a required health check, because
an unbuilt capability cannot be a production promise.

## Promoting a roadmap capability

Each entry in `roadmapCapabilities[]` declares its own `requiredPlumbing` and
`promotionGates`. The plumbing list is repository-specific and follows the
existing pattern for a seeded data source:

1. Proto messages and an RPC with `(sebuf.http.config)` under
   `proto/worldmonitor/health/v1/`, then `make generate`.
2. A handler under `server/worldmonitor/health/` using `cachedFetchJson()`.
3. The canonical key in `server/_shared/cache-keys.ts`.
4. The canonical key, the `seed-meta:` key, and a freshness budget in
   `api/health.js`.
5. Bootstrap hydration in `api/bootstrap.js`.
6. A seed script under `scripts/` calling `runSeed()` with the canonical key.
7. MCP exposure in `api/mcp.ts` when the capability is agent-relevant.
8. A readiness entry in `scripts/healthradar-readiness.json`.

Then move the entry from `roadmapCapabilities[]` into `capabilities[]` with
status `deferred_candidate`, and enable the cadence only once a full freshness
window has been proven in production.

## Source acceptance checklist

Every source, in every tier, carries `role`, `credential`, and
`commercialTermsReview` in the policy file. Before it ships:

1. Prefer primary public-health, regulator, registry, peer-reviewed, or
   directly measured sources. Label secondary reporting explicitly in `role`.
2. Record provenance per item: source name, source URL, publication or
   measurement time, and methodology version where the source has one.
3. Confirm licensing and redistribution terms, and record the review state.
   Unreviewed terms block a commercial launch, not a merge.
4. Add bounded timeouts, rate-limit handling, cache and stale fallback, and a
   health signal — a source without a freshness signal is not shippable.
5. Test missing timestamps, synthetic timestamps, future clock skew, empty
   results, source outages, and partial-source success.
6. Keep credentials out of the repository. Declare the credential *name* in the
   policy and document it in `.env.example`.

## Contributing

- Propose a source with the
  [healthcare data source issue template](https://github.com/HealthRadar24/healthradar24/issues/new?template=health_data_source.yml).
- Engineering conventions, review process, and local setup:
  [CONTRIBUTING.md](../CONTRIBUTING.md) and [AGENTS.md](../AGENTS.md).
- Community expectations: [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
- Vulnerability disclosure: [SECURITY.md](../SECURITY.md). Report privately;
  never open a public issue containing health data of any kind.

Contributions are accepted under AGPL-3.0-only. Do not open a pull request
containing patient data, screenshots of clinical systems, or credentials.

## Related documents

- [Healthcare foundation](healthradar-healthcare-foundation.md) — the two
  currently plumbed capabilities and their contracts.
- [Fork operations](healthradar-operations.md) — deployment, cadences, and
  operational ownership.
- [Provider policy](healthradar-provider-policy.md) — inherited provider
  blocks and credential posture.
- [Commercial launch](healthradar-commercial-launch.md) — gates that must pass
  before payments are enabled.
