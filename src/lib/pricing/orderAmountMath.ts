export interface RoundedOrderAmountsInput {
  originalPrice: number;
  finalPrice: number;
  quantity: number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildRoundedOrderAmounts(input: RoundedOrderAmountsInput) {
  const quantity = Number(input.quantity) || 0;
  const originalPrice = round2(Number(input.originalPrice) || 0);
  const finalPrice = round2(Number(input.finalPrice) || 0);
  const totalOriginalPrice = round2(originalPrice * quantity);
  const totalAfterPromotionsAmount = round2(finalPrice * quantity);
  const productDiscountAmount = round2(Math.max(0, totalOriginalPrice - totalAfterPromotionsAmount));
  const finalAmount = totalAfterPromotionsAmount;

  return {
    totalOriginalPrice,
    totalAfterPromotionsAmount,
    productDiscountAmount,
    finalAmount,
  };
}
