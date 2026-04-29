function toSafeNumber(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDisplayPromotions(promotions, selectedPromotion) {
  const list = Array.isArray(promotions) ? promotions.slice() : [];
  const promotionId = selectedPromotion?.promotion_id;
  const isExclusive = Boolean(selectedPromotion?.is_exclusive);

  const filtered = isExclusive && promotionId ? list.filter(p => p.id === promotionId) : list;
  return filtered.sort((a, b) => toSafeNumber(a.priority) - toSafeNumber(b.priority));
}

module.exports = { getDisplayPromotions };

