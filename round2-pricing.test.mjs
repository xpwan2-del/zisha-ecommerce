import assert from 'node:assert/strict';
import { applyPromotions } from './src/lib/pricing/cartPricing.js';
import { buildRoundedOrderAmounts } from './src/lib/pricing/orderAmountMath.ts';

const exclusiveResult = applyPromotions(11.11, [
  { can_stack: 1, discount_percent: 31 },
]);

assert.equal(exclusiveResult.finalPrice, 7.67);
assert.equal(exclusiveResult.totalDiscountPercent, 31);

const stackedResult = applyPromotions(19.99, [
  { can_stack: 0, priority: 1, discount_percent: 12 },
  { can_stack: 0, priority: 2, discount_percent: 33 },
]);

assert.equal(stackedResult.finalPrice, 11.79);
assert.equal(stackedResult.totalDiscountPercent, 41.04);

const orderAmounts = buildRoundedOrderAmounts({
  originalPrice: 47.64,
  finalPrice: 30.9616,
  quantity: 3,
});

assert.deepEqual(orderAmounts, {
  totalOriginalPrice: 142.92,
  totalAfterPromotionsAmount: 92.88,
  productDiscountAmount: 50.04,
  finalAmount: 92.88,
});

console.log('round2 pricing tests passed');
