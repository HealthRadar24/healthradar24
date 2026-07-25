import assert from 'node:assert/strict';
import test from 'node:test';

test('product catalog strips upstream checkout IDs while commerce is disabled', async () => {
  const previous = process.env.PAYMENTS_ENABLED;
  process.env.PAYMENTS_ENABLED = 'false';

  try {
    const { default: handler } = await import(
      `../api/product-catalog.js?commerce-gate=${Date.now()}-${Math.random()}`
    );
    const response = await handler(new Request('https://healthradar24.com/api/product-catalog'));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.commerceEnabled, false);
    assert.ok(body.tiers.length > 0);
    for (const tier of body.tiers) {
      assert.equal('monthlyProductId' in tier, false);
      assert.equal('annualProductId' in tier, false);
      assert.equal('monthlyPrice' in tier, false);
      assert.equal('annualPrice' in tier, false);
    }
  } finally {
    if (previous === undefined) delete process.env.PAYMENTS_ENABLED;
    else process.env.PAYMENTS_ENABLED = previous;
  }
});
