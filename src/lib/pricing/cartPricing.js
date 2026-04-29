function toSafeNumber(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrency(currency) {
  const c = String(currency || '').toLowerCase();
  if (c === 'usd' || c === 'cny' || c === 'aed') return c;
  return 'aed';
}

function getBasePrice(row, currency) {
  const c = normalizeCurrency(currency);
  const map = {
    usd: toSafeNumber(row.price_usd),
    cny: toSafeNumber(row.price_cny),
    aed: toSafeNumber(row.price_aed)
  };

  if (map[c] > 0) return map[c];
  if (map.usd > 0) return map.usd;
  if (map.aed > 0) return map.aed;
  if (map.cny > 0) return map.cny;
  return 0;
}

function applyPromotions(basePrice, promos) {
  const price = toSafeNumber(basePrice);
  const list = Array.isArray(promos) ? promos : [];
  if (price <= 0 || list.length === 0) {
    return { finalPrice: price, totalDiscountPercent: 0, isExclusive: false };
  }

  const exclusive = list.find(p => Number(p.can_stack) === 1);
  if (exclusive) {
    const percent = toSafeNumber(exclusive.discount_percent);
    const finalPrice = price * (100 - percent) / 100;
    return {
      finalPrice,
      totalDiscountPercent: percent,
      isExclusive: true
    };
  }

  const sorted = list.slice().sort((a, b) => toSafeNumber(a.priority) - toSafeNumber(b.priority));
  let multiplier = 1;
  for (const p of sorted) {
    multiplier *= (1 - toSafeNumber(p.discount_percent) / 100);
  }
  const totalDiscountPercent = Math.round((1 - multiplier) * 10000) / 100;
  const finalPrice = price * multiplier;
  return { finalPrice, totalDiscountPercent, isExclusive: false };
}

module.exports = { getBasePrice, applyPromotions };

