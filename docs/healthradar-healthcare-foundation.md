# HealthRadar24 healthcare foundation

HealthRadar24 begins with two inherited, already freshness-tracked capabilities:
disease-outbreak advisories and environmental air-quality measurements. This is
the stable technical baseline for later healthcare and life-science work; it is
not yet a clinical product.

The machine-readable source policy is
`shared/healthradar-health-sources.json`. Validate it with:

```bash
npm run health:governance
```

## Baseline capability contract

| Capability | Canonical data | Cadence | Freshness gate | Product role |
|---|---|---:|---:|---|
| Disease outbreaks | `health:disease-outbreaks:v1` | Daily | 48 hours | Public outbreak and advisory awareness |
| Health air quality | `health:air-quality:v1` | Hourly | 3 hours | PM2.5/environmental-health awareness |

Both capabilities already have typed Health RPCs, Redis seed metadata, health
registry entries, bootstrap/MCP integration, and upstream regression tests. The
fork readiness policy requires them so an upstream sync cannot silently remove
the healthcare starting point.

## Interpretation boundary

- Alerts are signals to investigate, not diagnoses or clinical risk scores.
- Disease `alert`, `warning`, and `watch` labels are an editorial keyword
  classifier, not a WHO/ECDC clinical classification.
- Air-quality risk buckets are environmental screening signals and can differ
  from local public-health guidance.
- Source links, publication/measurement time, methodology version, and
  freshness must remain visible.
- HealthRadar does not collect patient records, identifiers, protected health
  information, or symptom reports in this baseline.
- Users should rely on local health authorities and qualified professionals for
  medical or emergency decisions.

## Source acceptance

Before a new health or life-science source ships:

1. Add it to the source policy with purpose, credential class, cadence,
   freshness, data classification, and commercial-terms review status.
2. Prefer primary public-health, regulator, registry, peer-reviewed, or
   directly measured sources. Label secondary reporting explicitly.
3. Record provenance per item; never collapse a secondary interpretation into a
   primary-source claim.
4. Add bounded timeouts, rate-limit handling, cache/stale fallback, bootstrap
   hydration, and a health signal.
5. Test missing timestamps, synthetic timestamps, future clock skew, empty
   results, source outages, and partial-source success.
6. Complete security, privacy, licensing, and redistribution review before a
   commercial launch.

## First product-development slice

After the platform PR is deployed and stable, the recommended first
HealthRadar-specific feature is a health-intelligence workspace that combines:

- disease advisories;
- air-quality exposure;
- relevant supply-chain, travel, weather, conflict, and infrastructure context;
- source provenance and freshness;
- user watchlists without collecting health records.

That slice reuses the upstream map, correlation, country, notification, and
forecast machinery while giving HealthRadar a distinct healthcare identity.
Clinical workflows, patient data, diagnostic recommendations, and regulated
medical-device claims remain out of scope until a separate governance program
exists.
