const test = require('node:test');
const assert = require('node:assert/strict');

const { getDisplayPromotions } = require('../src/lib/pricing/promotionDisplay.js');

test('getDisplayPromotions returns only applied promo when exclusive', () => {
  const promos = [
    { id: 1, priority: 2 },
    { id: 2, priority: 1 },
    { id: 3, priority: 3 }
  ];
  const selected = { promotion_id: 2, is_exclusive: true };
  const result = getDisplayPromotions(promos, selected);
  assert.deepEqual(result, [{ id: 2, priority: 1 }]);
});

test('getDisplayPromotions returns all promos sorted by priority when not exclusive', () => {
  const promos = [
    { id: 1, priority: 2 },
    { id: 2, priority: 1 },
    { id: 3, priority: 3 }
  ];
  const selected = { promotion_id: 2, is_exclusive: false };
  const result = getDisplayPromotions(promos, selected);
  assert.deepEqual(result, [
    { id: 2, priority: 1 },
    { id: 1, priority: 2 },
    { id: 3, priority: 3 }
  ]);
});

