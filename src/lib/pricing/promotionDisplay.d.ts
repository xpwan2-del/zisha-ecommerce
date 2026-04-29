export function getDisplayPromotions(
  promotions: Array<{ id: number; priority?: any }> | undefined,
  selectedPromotion: { promotion_id?: number; is_exclusive?: boolean } | undefined
): Array<{ id: number; priority?: any }>;

