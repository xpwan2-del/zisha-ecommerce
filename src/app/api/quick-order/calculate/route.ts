import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 快速订单价格计算
 * ============================================================
 *
 * @api {POST} /api/quick-order/calculate 计算快速订单价格
 * @apiName CalculateQuickOrder
 * @apiGroup ORDERS
 * @apiDescription 计算快速订单的价格（商品价格+运费+优惠券），支持多券叠加
 *
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiBody {Number} product_id 商品ID
 * @apiBody {Number} quantity 购买数量
 * @apiBody {Number} [address_id] 收货地址ID
 * @apiBody {String} payment_method 支付方式 (paypal/alipay)
 * @apiBody {Number[]} [coupon_ids] 优惠券ID数组（支持多券叠加）
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} UNAUTHORIZED 未登录
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

interface CalculateRequest {
  product_id: number;
  quantity: number;
  address_id?: number;
  coupon_ids?: number[];
  payment_method: 'paypal' | 'alipay';
}

async function calculateProductPrice(productId: number): Promise<{ originalPrice: number; finalPrice: number; discount: number; priceUsd: number; priceCny: number; priceAed: number; promotions: Array<{id: number; name: string; discount: number; percent: number}> }> {
  const productResult = await query(
    `SELECT 
      pp_usd.price as price_usd,
      pp_cny.price as price_cny,
      pp_aed.price as price_aed
    FROM product_prices pp_usd
    LEFT JOIN product_prices pp_cny ON pp_usd.product_id = pp_cny.product_id AND pp_cny.currency = 'CNY'
    LEFT JOIN product_prices pp_aed ON pp_usd.product_id = pp_aed.product_id AND pp_aed.currency = 'AED'
    WHERE pp_usd.product_id = ? AND pp_usd.currency = 'USD'`,
    [productId]
  );

  if (productResult.rows.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }

  const product = productResult.rows[0];
  const originalPriceUSD = parseFloat(product.price_usd) || 0;
  const currentPriceUSD = parseFloat(product.price_usd) || 0;

  const promoResult = await query(`
    SELECT
      pr.id as promo_id,
      pr.name as promo_name,
      pr.discount_percent,
      pp.can_stack
    FROM product_promotions pp
    JOIN promotions pr ON pp.promotion_id = pr.id
    WHERE pp.product_id = ?
      AND datetime(pp.start_time) <= datetime('now')
      AND datetime(pp.end_time) >= datetime('now')
  `, [productId]);

  const promos = promoResult.rows;
  const promotions: Array<{id: number; name: string; discount: number; percent: number}> = [];
  let finalPriceUSD = currentPriceUSD;

  if (promos.length > 0) {
    const exclusive = promos.find((p: any) => p.can_stack === 1);

    if (exclusive) {
      finalPriceUSD = originalPriceUSD * (1 - exclusive.discount_percent / 100);
      promotions.push({
        id: exclusive.promo_id,
        name: exclusive.promo_name || '促销活动',
        discount: originalPriceUSD - finalPriceUSD,
        percent: exclusive.discount_percent
      });
    } else {
      let multiplier = 1;
      promos.forEach((p: any) => {
        multiplier *= (1 - p.discount_percent / 100);
        promotions.push({
          id: p.promo_id,
          name: p.promo_name || '促销活动',
          discount: originalPriceUSD * p.discount_percent / 100,
          percent: p.discount_percent
        });
      });
      finalPriceUSD = originalPriceUSD * multiplier;
    }
  }

  const discount = originalPriceUSD - finalPriceUSD;

  return {
    originalPrice: originalPriceUSD,
    finalPrice: finalPriceUSD,
    discount,
    priceUsd: originalPriceUSD,
    priceCny: parseFloat(product.price_cny) || 0,
    priceAed: parseFloat(product.price_aed) || 0,
    promotions
  };
}

async function calculateShipping(addressId: number, city: string): Promise<number> {
  try {
    const shippingResult = await query(`
      SELECT shipping_fee FROM shipping_rates
      WHERE city = ? AND is_active = 1
      LIMIT 1
    `, [city]);

    if (shippingResult.rows.length > 0) {
      return parseFloat(shippingResult.rows[0].shipping_fee) || 0;
    }

    const defaultShipping = await query(`
      SELECT shipping_fee FROM shipping_rates
      WHERE is_default = 1 AND is_active = 1
      LIMIT 1
    `);

    if (defaultShipping.rows.length > 0) {
      return parseFloat(defaultShipping.rows[0].shipping_fee) || 0;
    }

    return 0;
  } catch (error) {
    console.error('calculateShipping error:', error);
    return 0;
  }
}

async function applyCouponDiscount(couponId: number, subtotal: number): Promise<{ discount: number; finalAmount: number }> {
  const couponResult = await query(`
    SELECT c.type, c.value
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.id = ? AND uc.status = 'active'
      AND datetime('now') < uc.expires_at
      AND c.is_active = 1
  `, [couponId]);

  if (couponResult.rows.length === 0) {
    return { discount: 0, finalAmount: subtotal };
  }

  const coupon = couponResult.rows[0];
  let discount = 0;

  if (coupon.type === 'percentage') {
    discount = subtotal * (parseFloat(coupon.value) / 100);
  } else if (coupon.type === 'fixed') {
    discount = parseFloat(coupon.value);
  }

  discount = Math.min(discount, subtotal);
  const finalAmount = Math.max(0, subtotal - discount);

  return { discount, finalAmount };
}

async function applyMultipleCoupons(couponIds: number[], subtotal: number, userId: number): Promise<{ totalDiscount: number; couponDetails: Array<{ id: number; discount: number; code: string; type: string; value: number }> }> {
  if (!couponIds || couponIds.length === 0) {
    return { totalDiscount: 0, couponDetails: [] };
  }

  const couponDetails: Array<{ id: number; discount: number; code: string; type: string; value: number }> = [];
  
  let percentageCoupons: Array<{ id: number; code: string; value: number }> = [];
  let fixedCoupons: Array<{ id: number; code: string; value: number }> = [];

  for (const couponId of couponIds) {
    const couponResult = await query(`
      SELECT c.type, c.value, c.code, c.is_stackable
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'active'
        AND datetime('now') < uc.expires_at
        AND c.is_active = 1
    `, [couponId, userId]);

    if (couponResult.rows.length === 0) continue;

    const coupon = couponResult.rows[0];

    if (coupon.is_stackable === 0 && couponDetails.length > 0) {
      continue;
    }

    if (coupon.type === 'percentage') {
      percentageCoupons.push({
        id: couponId,
        code: coupon.code || '',
        value: parseFloat(coupon.value)
      });
    } else if (coupon.type === 'fixed') {
      fixedCoupons.push({
        id: couponId,
        code: coupon.code || '',
        value: parseFloat(coupon.value)
      });
    }
  }

  let remainingSubtotal = subtotal;
  let totalDiscount = 0;

  // 第一步：先计算所有百分比折扣（乘法）
  if (percentageCoupons.length > 0) {
    // 计算所有百分比折扣的累积乘数
    // 例如：10% + 20% 的叠加 = 100 × 0.9 × 0.8 = 72（最终价格）
    const multiplier = percentageCoupons.reduce((acc, c) => acc * (1 - c.value / 100), 1);
    const afterPercentage = subtotal * multiplier;
    const percentageDiscount = subtotal - afterPercentage;

    // 计算每个百分比券的折扣（按比例分配总折扣）
    // 每张券的折扣 = 总折扣 × (该券折扣额 / 所有券折扣额之和)
    const totalPercentageValue = percentageCoupons.reduce((acc, c) => acc + c.value, 0);

    for (const c of percentageCoupons) {
      // 按比例分配：券A的折扣 = 总折扣 × (A的折扣额 / 所有券折扣额之和)
      const discount = totalPercentageValue > 0
        ? percentageDiscount * (c.value / totalPercentageValue)
        : 0;

      totalDiscount += discount;
      remainingSubtotal = afterPercentage;
      couponDetails.push({
        id: c.id,
        discount: Math.round(discount * 100) / 100,
        code: c.code,
        type: 'percentage',
        value: c.value
      });
    }
  }

  if (fixedCoupons.length > 0) {
    for (const c of fixedCoupons) {
      const discount = Math.min(c.value, remainingSubtotal);
      totalDiscount += discount;
      remainingSubtotal -= discount;
      couponDetails.push({
        id: c.id,
        discount,
        code: c.code,
        type: 'fixed',
        value: c.value
      });
    }
  }

  return { totalDiscount, couponDetails };
}

export async function POST(request: NextRequest) {
  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/quick-order/calculate'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('ORDERS', 'AUTH_FAILED', {
        reason: 'Unauthorized'
      });
      return authResult.response;
    }

    const body: CalculateRequest = await request.json();
    const { product_id, quantity, address_id, coupon_ids, payment_method } = body;

    if (!product_id || !quantity || !payment_method) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        required: { product_id, quantity, payment_method }
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['paypal', 'alipay'].includes(payment_method)) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Invalid payment method',
        payment_method
      });
      return NextResponse.json(
        { success: false, error: 'Invalid payment method. Only PayPal and Alipay are supported.' },
        { status: 400 }
      );
    }

    logMonitor('ORDERS', 'INFO', {
      action: 'CALCULATE_QUICK_ORDER',
      productId: product_id,
      quantity,
      addressId: address_id,
      couponIds: coupon_ids,
      paymentMethod: payment_method
    });

    const { originalPrice, finalPrice, discount: productDiscount, priceUsd, priceCny, priceAed, promotions } = await calculateProductPrice(product_id);

    const subtotalUSD = finalPrice * quantity;
    const originalSubtotalUSD = originalPrice * quantity;

    let shippingFee = 0;
    let addressInfo: any = null;

    if (address_id) {
      const addressResult = await query(`
        SELECT id, contact_name, phone, street_address, city, country_name
        FROM addresses
        WHERE id = ? AND user_id = ?
      `, [address_id, authResult.user.userId]);

      if (addressResult.rows.length > 0) {
        addressInfo = addressResult.rows[0];
        shippingFee = await calculateShipping(address_id, addressInfo.city);
      }
    }

    let couponDiscount = 0;
    let couponInfo: any = null;

    if (coupon_ids && coupon_ids.length > 0) {
      const { totalDiscount, couponDetails } = await applyMultipleCoupons(coupon_ids, subtotalUSD, authResult.user.userId);
      couponDiscount = totalDiscount;
      couponInfo = { ids: coupon_ids, discount: couponDiscount, details: couponDetails };
    }

    const subtotalAfterCouponUSD = subtotalUSD - couponDiscount;
    const totalUSD = subtotalAfterCouponUSD + shippingFee;

    let displayCurrency: string;
    let displayTotal: number;

    const totalCNY = priceCny * quantity - couponDiscount + shippingFee;

    displayCurrency = 'USD';
    displayTotal = totalUSD;

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'CALCULATE_QUICK_ORDER',
      productId: product_id,
      quantity,
      originalPriceUSD: originalPrice,
      finalPriceUSD: finalPrice,
      productDiscountUSD: productDiscount,
      subtotalUSD: subtotalUSD,
      couponDiscountUSD: couponDiscount,
      shippingFeeUSD: shippingFee,
      totalUSD: totalUSD,
      totalCNY: totalCNY,
      totalAED: totalUSD
    });

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product_id,
          price_usd: finalPrice,
          price_cny: priceCny,
          price_aed: priceAed,
          original_price_usd: originalPrice,
          original_price_cny: priceCny,
          original_price_aed: priceAed,
          quantity
        },
        subtotal_usd: subtotalUSD,
        original_subtotal_usd: originalSubtotalUSD,
        subtotal_cny: priceCny * quantity,
        original_subtotal_cny: priceCny * quantity,
        product_discount_usd: productDiscount,
        product_discount_cny: productDiscount,
        coupon_discount_usd: couponDiscount,
        coupon_discount_cny: couponDiscount,
        shipping_fee_usd: shippingFee,
        shipping_fee_cny: shippingFee,
        total_usd: totalUSD,
        total_cny: totalCNY,
        total_aed: priceAed * quantity + shippingFee,
        display_currency: 'USD',
        display_total: totalUSD,
        address: addressInfo,
        coupon: couponInfo,
        product_promotions: promotions,
        payment_method
      }
    });
  } catch (error) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'CALCULATE_QUICK_ORDER',
      error: String(error)
    });
    console.error('Error in quick-order calculate API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate price' },
      { status: 500 }
    );
  }
}