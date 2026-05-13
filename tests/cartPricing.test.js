const test = require('node:test');
const assert = require('node:assert/strict');

const { getBasePrice, applyPromotions } = require('../src/lib/pricing/cartPricing.js');

test('getBasePrice selects price by currency with USD fallback', () => {
  const row = { price_usd: 10, price_cny: 20, price_aed: 30 };
  assert.equal(getBasePrice(row, 'aed'), 30);
  assert.equal(getBasePrice(row, 'cny'), 20);
  assert.equal(getBasePrice(row, 'usd'), 10);
  assert.equal(getBasePrice({ price_usd: 10 }, 'aed'), 10);
});

test('applyPromotions uses exclusive promo when can_stack=1', () => {
  const promos = [
    { discount_percent: 10, can_stack: 0, priority: 2 },
    { discount_percent: 20, can_stack: 1, priority: 1 }
  ];
  const result = applyPromotions(100, promos);
  assert.equal(result.finalPrice, 80);
  assert.equal(result.totalDiscountPercent, 20);
  assert.equal(result.isExclusive, true);
});

test('applyPromotions stacks promos when no exclusive promo', () => {
  const promos = [
    { discount_percent: 10, can_stack: 0, priority: 2 },
    { discount_percent: 20, can_stack: 0, priority: 1 }
  ];
  const result = applyPromotions(100, promos);
  assert.ok(Math.abs(result.finalPrice - 72) < 1e-9);
  assert.equal(result.totalDiscountPercent, 28);
  assert.equal(result.isExclusive, false);
});
