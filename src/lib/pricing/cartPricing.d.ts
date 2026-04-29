export function getBasePrice(
  row: { price_usd?: any; price_cny?: any; price_aed?: any },
  currency: string
): number;

export function applyPromotions(
  basePrice: any,
  promos: Array<{ discount_percent?: any; can_stack?: any; priority?: any }>
): { finalPrice: number; totalDiscountPercent: number; isExclusive: boolean };

