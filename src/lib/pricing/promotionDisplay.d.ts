export function getDisplayPromotions(
  promotions: Array<{ id: number; name?: string; discount_percent?: number; priority?: any }> | undefined,
  selectedPromotion: { promotion_id?: number; is_exclusive?: boolean; name?: string } | undefined
): Array<{ id: number; name?: string; discount_percent?: number; priority?: any }>;

