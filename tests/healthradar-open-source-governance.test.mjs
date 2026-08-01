import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const policy = JSON.parse(read('shared/healthradar-health-sources.json'));
const readiness = JSON.parse(read('scripts/healthradar-readiness.json'));
const charter = read('docs/healthradar-open-source.md');

const domainIds = new Set(policy.domains.map((domain) => domain.id));

describe('HealthRadar24 open-source healthcare and life-science governance', () => {
  it('declares the open-source positioning, license, and upstream credit', () => {
    assert.equal(policy.schemaVersion, 2);
    assert.equal(policy.openSource.license, 'AGPL-3.0-only');
    assert.equal(
      policy.openSource.positioning,
      'open_source_healthcare_and_life_science_intelligence',
    );
    assert.equal(policy.openSource.charterDoc, 'docs/healthradar-open-source.md');
    assert.equal(policy.openSource.selfHostingSupported, true);
    assert.match(policy.openSource.upstreamRepository, /koala73\/worldmonitor/);
  });

  it('keeps the clinical and personal-data boundary prohibited', () => {
    assert.equal(policy.productBoundary.protectedHealthInformation, 'prohibited');
    assert.equal(policy.productBoundary.medicalDeviceClaim, 'prohibited');
    assert.equal(policy.productBoundary.clinicalDecisionSupport, 'prohibited');
    assert.equal(policy.productBoundary.personalData, 'not_collected');
    assert.equal(
      policy.productBoundary.clinicalUse,
      'not_for_diagnosis_treatment_or_emergency_guidance',
    );
  });

  it('covers healthcare and life-science domains with source classes and exclusions', () => {
    for (const expected of [
      'publicHealthSurveillance',
      'environmentalHealth',
      'pathogenGenomics',
      'clinicalResearch',
      'regulatoryAndSafety',
      'biomedicalLiterature',
      'healthSupplyChain',
    ]) {
      assert.ok(domainIds.has(expected), `missing governed domain ${expected}`);
    }
    assert.equal(domainIds.size, policy.domains.length, 'duplicate domain id');

    for (const domain of policy.domains) {
      assert.ok(domain.name && domain.scope, `${domain.id} needs a name and scope`);
      assert.ok(domain.primarySourceClasses.length > 0, `${domain.id} needs source classes`);
      assert.ok(domain.exclusions.length > 0, `${domain.id} needs exclusions`);
      assert.ok(charter.includes(`\`${domain.id}\``), `${domain.id} missing from the charter`);
    }
  });

  it('binds every capability to a governed domain and a readiness tier', () => {
    const required = new Set((readiness.requiredHealthChecks ?? []).map((entry) => entry.name));
    const deferred = new Set((readiness.deferredHealthChecks ?? []).map((entry) => entry.name));

    for (const capability of policy.capabilities) {
      assert.ok(domainIds.has(capability.domain), `${capability.id} has an ungoverned domain`);
      assert.ok(
        ['required_baseline', 'deferred_candidate'].includes(capability.status),
        `${capability.id} has an unknown status`,
      );
      const tier = capability.status === 'required_baseline' ? required : deferred;
      assert.ok(tier.has(capability.id), `${capability.id} missing from its readiness tier`);
      assert.ok(capability.maxStaleMinutes >= capability.cadenceMinutes);
      assert.ok(capability.sources.length > 0);
    }
  });

  it('keeps unbuilt life-science capabilities out of the production promise', () => {
    const required = new Set((readiness.requiredHealthChecks ?? []).map((entry) => entry.name));
    const health = read('api/health.js');
    const plumbed = new Set(policy.capabilities.map((capability) => capability.id));

    assert.ok(policy.roadmapCapabilities.length > 0);
    for (const capability of policy.roadmapCapabilities) {
      assert.equal(capability.status, 'roadmap_candidate');
      assert.ok(domainIds.has(capability.domain), `${capability.id} has an ungoverned domain`);
      assert.ok(!plumbed.has(capability.id), `${capability.id} is declared in both tiers`);
      assert.ok(!required.has(capability.id), `${capability.id} claims a production promise`);
      assert.ok(
        !health.includes(capability.proposedCanonicalKey),
        `${capability.id} is plumbed and must be promoted out of roadmapCapabilities`,
      );
      assert.match(capability.proposedApiRoute, /^\/api\/health\/v1\//);
      assert.match(capability.proposedCanonicalKey, /^health:[a-z0-9-]+:v\d+$/);
      assert.match(capability.proposedSeedMetaKey, /^seed-meta:health:/);
      assert.ok(capability.requiredPlumbing.length > 0, `${capability.id} needs plumbing steps`);
      assert.ok(capability.promotionGates.length > 0, `${capability.id} needs promotion gates`);
      assert.ok(capability.rationale, `${capability.id} needs a rationale`);
    }
  });

  it('covers the life-science half of the platform, not only public health', () => {
    const covered = new Set([
      ...policy.capabilities.map((capability) => capability.domain),
      ...policy.roadmapCapabilities.map((capability) => capability.domain),
    ]);
    for (const domain of [
      'clinicalResearch',
      'regulatoryAndSafety',
      'biomedicalLiterature',
      'pathogenGenomics',
      'healthSupplyChain',
    ]) {
      assert.ok(covered.has(domain), `no declared capability covers ${domain}`);
    }
  });

  it('declares role, credential class, and licensing review for every source', () => {
    const all = [...policy.capabilities, ...policy.roadmapCapabilities];
    for (const capability of all) {
      const ids = new Set();
      for (const source of capability.sources) {
        for (const field of ['id', 'name', 'role', 'credential', 'commercialTermsReview']) {
          assert.ok(source[field], `${capability.id} source missing ${field}`);
        }
        assert.ok(!ids.has(source.id), `${capability.id} repeats source ${source.id}`);
        ids.add(source.id);
      }
    }
  });

  it('points contributors at the charter from the public entry points', () => {
    for (const path of ['README.md', 'CONTRIBUTING.md', '.github/ISSUE_TEMPLATE/health_data_source.yml']) {
      assert.match(read(path), /healthradar-open-source\.md/, `${path} must link the charter`);
    }
    assert.match(read('README.md'), /Open-source healthcare and life-science intelligence/);
    assert.match(charter, /not_for_diagnosis|Not medical advice/);
  });
});
