import { query } from '@/lib/db';
import { applyPromotions } from '@/lib/pricing/cartPricing';

const USD_TO_CNY = 7.32;
const USD_TO_AED = 3.67;

export interface PricingCouponDetail {
  id: number;
  discount: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
}

export interface PricingItemDetail {
  product_id: number;
  quantity: number;
  original_price_usd: number;
  final_price_usd: number;
  promotion_ids: number[];
  product_discount_amount: number;
}

export interface PricingPromotionDetail {
  id: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  discount: number;
  percent: number;
  baseAmount: number;
}

export interface AddressDetail {
  id: number;
  contact_name: string;
  phone: string;
  street_address: string;
  city: string;
  country_name: string;
}

export interface OrderPricingResult {
  order_id: number;
  total_original_price: number;
  total_promotions_discount_amount: number;
  total_after_promotions_amount: number;
  total_coupon_discount: number;
  order_final_discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  total_usd: number;
  total_cny: number;
  total_aed: number;
  subtotal: number;
  original_total: number;
  product_discount: number;
  coupon_discount: number;
  coupon_details: PricingCouponDetail[];
  promotions: PricingPromotionDetail[];
  items: PricingItemDetail[];
  address: AddressDetail | null;
}

interface CalculateOrderPricingInput {
  orderId: number;
  userId: number;
  addressId?: number;
  couponIds?: number[];
}

interface PersistOrderPricingInput extends CalculateOrderPricingInput {
  paymentMethod?: string;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function calculateShippingFee(city: string): Promise<number> {
  const shippingResult = await query(
    `SELECT shipping_fee FROM shipping_rates
     WHERE city = ? AND is_active = 1
     LIMIT 1`,
    [city]
  );

  if (shippingResult.rows.length > 0) {
    return round2(parseFloat(shippingResult.rows[0].shipping_fee) || 0);
  }

  const defaultShipping = await query(
    `SELECT shipping_fee FROM shipping_rates
     WHERE is_default = 1 AND is_active = 1
     LIMIT 1`,
    []
  );

  if (defaultShipping.rows.length > 0) {
    return round2(parseFloat(defaultShipping.rows[0].shipping_fee) || 0);
  }

  return 0;
}

async function applyMultipleCoupons(
  couponIds: number[],
  subtotal: number,
  userId: number
): Promise<{ totalDiscount: number; couponDetails: PricingCouponDetail[] }> {
  if (!couponIds || couponIds.length === 0) {
    return { totalDiscount: 0, couponDetails: [] };
  }

  const couponDetails: PricingCouponDetail[] = [];
  const percentageCoupons: Array<{ id: number; code: string; value: number }> = [];
  const fixedCoupons: Array<{ id: number; code: string; value: number }> = [];

  for (const couponId of couponIds) {
    const couponResult = await query(
      `SELECT c.type, c.value, c.code, c.is_stackable
       FROM user_coupons uc
       JOIN coupons c ON uc.coupon_id = c.id
       WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'active'
         AND datetime('now') < uc.expires_at
         AND c.is_active = 1`,
      [couponId, userId]
    );

    if (couponResult.rows.length === 0) {
      continue;
    }

    const coupon = couponResult.rows[0];

    if (coupon.is_stackable === 0 && couponDetails.length > 0) {
      continue;
    }

    if (coupon.type === 'percentage') {
      percentageCoupons.push({
        id: couponId,
        code: coupon.code || '',
        value: parseFloat(coupon.value) || 0,
      });
      continue;
    }

    if (coupon.type === 'fixed') {
      fixedCoupons.push({
        id: couponId,
        code: coupon.code || '',
        value: parseFloat(coupon.value) || 0,
      });
    }
  }

  let remainingSubtotal = subtotal;
  let totalDiscount = 0;

  if (percentageCoupons.length > 0) {
    const multiplier = percentageCoupons.reduce((acc, coupon) => acc * (1 - coupon.value / 100), 1);
    const afterPercentage = subtotal * multiplier;
    const percentageDiscount = subtotal - afterPercentage;
    const totalPercentageValue = percentageCoupons.reduce((acc, coupon) => acc + coupon.value, 0);

    for (const coupon of percentageCoupons) {
      const discount = totalPercentageValue > 0
        ? percentageDiscount * (coupon.value / totalPercentageValue)
        : 0;

      const roundedDiscount = round2(discount);
      totalDiscount += roundedDiscount;
      remainingSubtotal = afterPercentage;
      couponDetails.push({
        id: coupon.id,
        discount: roundedDiscount,
        code: coupon.code,
        type: 'percentage',
        value: coupon.value,
      });
    }
  }

  if (fixedCoupons.length > 0) {
    for (const coupon of fixedCoupons) {
      const discount = round2(Math.min(coupon.value, remainingSubtotal));
      totalDiscount += discount;
      remainingSubtotal = Math.max(0, remainingSubtotal - discount);
      couponDetails.push({
        id: coupon.id,
        discount,
        code: coupon.code,
        type: 'fixed',
        value: coupon.value,
      });
    }
  }

  return {
    totalDiscount: round2(Math.min(totalDiscount, subtotal)),
    couponDetails,
  };
}

async function getOrderAddress(addressId: number, userId: number): Promise<AddressDetail | null> {
  const addressResult = await query(
    `SELECT id, contact_name, phone, street_address, city, country_name
     FROM addresses
     WHERE id = ? AND user_id = ?`,
    [addressId, userId]
  );

  return addressResult.rows[0] || null;
}

export async function estimateOrderPricing(input: CalculateOrderPricingInput): Promise<OrderPricingResult> {
  const { orderId, userId, addressId, couponIds = [] } = input;

  const orderResult = await query(
    `SELECT id FROM orders WHERE id = ? AND user_id = ?`,
    [orderId, userId]
  );

  if (orderResult.rows.length === 0) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const orderItemsResult = await query(
    `SELECT oi.product_id, oi.quantity, pp.price as price_usd
     FROM order_items oi
     LEFT JOIN product_prices pp ON oi.product_id = pp.product_id AND pp.currency = 'USD'
     WHERE oi.order_id = ?`,
    [orderId]
  );

  if (orderItemsResult.rows.length === 0) {
    throw new Error('ORDER_EMPTY');
  }

  const productIds = orderItemsResult.rows.map((row: any) => row.product_id);
  const promoPlaceholders = productIds.map(() => '?').join(',');
  const promotionsResult = await query(
    `SELECT
       pp.product_id,
       pp.promotion_id,
       pp.can_stack,
       pp.priority,
       pr.name,
       pr.name_en,
       pr.name_ar,
       pr.discount_percent
     FROM product_promotions pp
     JOIN promotions pr ON pp.promotion_id = pr.id
     WHERE pp.product_id IN (${promoPlaceholders})
       AND datetime(pp.start_time) <= datetime('now')
       AND datetime(pp.end_time) >= datetime('now')
     ORDER BY pp.product_id, pp.priority ASC`,
    productIds
  );

  const promotionsMap = new Map<number, any[]>();
  for (const row of promotionsResult.rows || []) {
    if (!promotionsMap.has(row.product_id)) {
      promotionsMap.set(row.product_id, []);
    }
    promotionsMap.get(row.product_id)!.push(row);
  }

  const items: PricingItemDetail[] = orderItemsResult.rows.map((row: any) => {
    const originalPriceUsd = round2(parseFloat(row.price_usd) || 0);
    const promotions = promotionsMap.get(row.product_id) || [];
    const promotionResult = applyPromotions(originalPriceUsd, promotions);
    const finalPriceUsd = round2(promotionResult.finalPrice);
    const quantity = Number(row.quantity) || 0;
    const exclusive = promotions.find((promotion: any) => Number(promotion.can_stack) === 1);
    const appliedPromotions = exclusive
      ? [exclusive]
      : [...promotions].sort((a: any, b: any) => Number(a.priority || 0) - Number(b.priority || 0));

    return {
      product_id: Number(row.product_id),
      quantity,
      original_price_usd: originalPriceUsd,
      final_price_usd: finalPriceUsd,
      promotion_ids: appliedPromotions.map((promotion: any) => Number(promotion.promotion_id)),
      product_discount_amount: round2((originalPriceUsd - finalPriceUsd) * quantity),
    };
  });

  const totalOriginalPrice = round2(items.reduce((sum, item) => sum + item.original_price_usd * item.quantity, 0));
  const totalAfterPromotionsAmount = round2(items.reduce((sum, item) => sum + item.final_price_usd * item.quantity, 0));
  const totalPromotionsDiscountAmount = round2(Math.max(0, totalOriginalPrice - totalAfterPromotionsAmount));
  const promotionDiscounts = new Map<number, { discount: number; baseAmount: number }>();

  for (const item of items) {
    if (item.product_discount_amount <= 0 || item.promotion_ids.length === 0) continue;
    const promotions = promotionsMap.get(item.product_id) || [];
    const percentTotal = promotions
      .filter((promotion: any) => item.promotion_ids.includes(Number(promotion.promotion_id)))
      .reduce((sum: number, promotion: any) => sum + (parseFloat(promotion.discount_percent) || 0), 0);

    item.promotion_ids.forEach((promotionId, index) => {
      const promotion = promotions.find((row: any) => Number(row.promotion_id) === promotionId);
      const percent = parseFloat(promotion?.discount_percent) || 0;
      const previous = promotionDiscounts.get(promotionId) || { discount: 0, baseAmount: 0 };
      const discount = index === item.promotion_ids.length - 1
        ? item.product_discount_amount - item.promotion_ids.slice(0, -1).reduce((sum, id) => {
          const row = promotions.find((promotionRow: any) => Number(promotionRow.promotion_id) === id);
          const weight = percentTotal > 0 ? (parseFloat(row?.discount_percent) || 0) / percentTotal : 1 / item.promotion_ids.length;
          return sum + round2(item.product_discount_amount * weight);
        }, 0)
        : round2(item.product_discount_amount * (percentTotal > 0 ? percent / percentTotal : 1 / item.promotion_ids.length));
      promotionDiscounts.set(promotionId, {
        discount: round2(previous.discount + discount),
        baseAmount: round2(previous.baseAmount + item.original_price_usd * item.quantity),
      });
    });
  }

  const promotions = Array.from(promotionDiscounts.entries()).map(([promotionId, amount]) => {
    const source = Array.from(promotionsMap.values()).flat().find((promotion: any) => Number(promotion.promotion_id) === promotionId);
    return {
      id: promotionId,
      name: source?.name || '促销活动',
      name_en: source?.name_en || source?.name || 'Promotion',
      name_ar: source?.name_ar || source?.name || 'عرض',
      discount: round2(amount.discount),
      percent: round2(parseFloat(source?.discount_percent) || 0),
      baseAmount: round2(amount.baseAmount),
    };
  }).filter((promotion) => promotion.discount > 0);

  let address: AddressDetail | null = null;
  let shippingFee = 0;

  if (addressId) {
    address = await getOrderAddress(addressId, userId);
    if (!address) {
      throw new Error('ADDRESS_NOT_FOUND');
    }
    shippingFee = await calculateShippingFee(address.city);
  }

  const { totalDiscount, couponDetails } = await applyMultipleCoupons(couponIds, totalAfterPromotionsAmount, userId);
  const totalCouponDiscount = round2(Math.min(totalDiscount, totalAfterPromotionsAmount));
  const orderFinalDiscountAmount = round2(totalPromotionsDiscountAmount + totalCouponDiscount);
  const finalAmount = round2(Math.max(0, totalAfterPromotionsAmount - totalCouponDiscount + shippingFee));

  return {
    order_id: orderId,
    total_original_price: totalOriginalPrice,
    total_promotions_discount_amount: totalPromotionsDiscountAmount,
    total_after_promotions_amount: totalAfterPromotionsAmount,
    total_coupon_discount: totalCouponDiscount,
    order_final_discount_amount: orderFinalDiscountAmount,
    shipping_fee: shippingFee,
    final_amount: finalAmount,
    total_usd: finalAmount,
    total_cny: round2(finalAmount * USD_TO_CNY),
    total_aed: round2(finalAmount * USD_TO_AED),
    subtotal: totalAfterPromotionsAmount,
    original_total: totalOriginalPrice,
    product_discount: totalPromotionsDiscountAmount,
    coupon_discount: totalCouponDiscount,
    coupon_details: couponDetails,
    promotions,
    items,
    address,
  };
}

export async function commitOrderPricing(input: PersistOrderPricingInput) {
  const { orderId, userId, addressId, couponIds = [], paymentMethod } = input;
  const pricing = await estimateOrderPricing({ orderId, userId, addressId, couponIds });

  const previousCoupons = await query(
    `SELECT id, coupon_id FROM order_coupons WHERE order_id = ? AND user_id = ?`,
    [orderId, userId]
  );

  for (const row of previousCoupons.rows) {
    await query(
      `UPDATE user_coupons SET status = 'active', used_order_id = NULL WHERE id = ? AND user_id = ?`,
      [row.coupon_id, userId]
    );
  }

  await query(`DELETE FROM order_coupons WHERE order_id = ? AND user_id = ?`, [orderId, userId]);

  if (couponIds.length > 0) {
    for (const couponDetail of pricing.coupon_details) {
      await query(
        `UPDATE user_coupons SET status = 'used', used_order_id = ? WHERE id = ? AND user_id = ?`,
        [orderId, couponDetail.id, userId]
      );
      await query(
        `INSERT INTO order_coupons (order_id, coupon_id, user_id, discount_applied, status, applied_at)
         VALUES (?, ?, ?, ?, 'applied', datetime('now'))`,
        [orderId, couponDetail.id, userId, couponDetail.discount]
      );
    }
  }

  await query(
    `UPDATE orders SET
       payment_method = COALESCE(?, payment_method),
       shipping_address_id = ?,
       shipping_fee = ?,
       coupon_ids = ?,
       total_coupon_discount = ?,
       total_original_price = ?,
       total_after_promotions_amount = ?,
       order_final_discount_amount = ?,
       final_amount = ?,
       updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
    [
      paymentMethod || null,
      addressId || null,
      pricing.shipping_fee,
      JSON.stringify(couponIds),
      pricing.total_coupon_discount,
      pricing.total_original_price,
      pricing.total_after_promotions_amount,
      pricing.order_final_discount_amount,
      pricing.final_amount,
      orderId,
      userId,
    ]
  );

  return pricing;
}

export async function calculateOrderPricing(input: CalculateOrderPricingInput): Promise<OrderPricingResult> {
  return estimateOrderPricing(input);
}

export async function persistOrderPricing(input: PersistOrderPricingInput) {
  return commitOrderPricing(input);
}
