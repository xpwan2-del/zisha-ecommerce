import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { estimateOrderPricing } from '@/lib/order-pricing-service';
import { round2 } from '@/lib/pricing/orderAmountMath';

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
  order_id?: number;
  quantity: number;
  address_id?: number;
  coupon_ids?: number[];
  payment_method: 'paypal' | 'alipay';
}

async function calculateProductPromotions(productId: number): Promise<Array<{id: number; name: string; discount: number; percent: number}>> {
  const promoResult = await query(`
    SELECT
      pr.id as promo_id,
      pr.name as promo_name,
      pr.discount_percent
    FROM product_promotions pp
    JOIN promotions pr ON pp.promotion_id = pr.id
    WHERE pp.product_id = ?
      AND datetime(pp.start_time) <= datetime('now')
      AND datetime(pp.end_time) >= datetime('now')
  `, [productId]);

  return promoResult.rows.map((promotion: any) => ({
    id: Number(promotion.promo_id),
    name: promotion.promo_name || '促销活动',
    discount: 0,
    percent: round2(parseFloat(promotion.discount_percent) || 0)
  }));
}

function buildAppliedPromotions(
  productPricing: { original_price_usd: number; final_price_usd: number; promotion_ids: number[]; product_discount_amount: number } | undefined,
  promotions: Array<{ id: number; name: string; discount: number; percent: number }>
) {
  if (!productPricing || !Array.isArray(productPricing.promotion_ids) || productPricing.promotion_ids.length === 0) {
    return [];
  }

  const appliedIds = new Set(productPricing.promotion_ids.map((id) => Number(id)));
  const appliedPromotions = promotions.filter((promotion) => appliedIds.has(Number(promotion.id)));
  const discountTotal = round2(Number(productPricing.product_discount_amount) || 0);

  if (appliedPromotions.length === 0 || discountTotal <= 0) {
    return [];
  }

  const originalPrice = round2(Number(productPricing.original_price_usd) || 0);
  const percentTotal = round2(appliedPromotions.reduce((sum, promotion) => sum + promotion.percent, 0));

  return appliedPromotions.map((promotion, index) => {
    if (index === appliedPromotions.length - 1) {
      const usedDiscount = appliedPromotions
        .slice(0, -1)
        .reduce((sum, item) => sum + item.discount, 0);
      return {
        ...promotion,
        discount: round2(discountTotal - usedDiscount)
      };
    }

    const weight = percentTotal > 0 ? promotion.percent / percentTotal : 1 / appliedPromotions.length;
    return {
      ...promotion,
      discount: round2(discountTotal * weight)
    };
  }).filter((promotion) => promotion.discount > 0 && originalPrice > 0);
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
    const { product_id, order_id, quantity, address_id, coupon_ids, payment_method } = body;

    if (!product_id || !quantity || !payment_method || !order_id) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        required: { product_id, order_id, quantity, payment_method }
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

    const orderResult = await query(
      `SELECT id, order_status
       FROM orders
       WHERE id = ? AND user_id = ?`,
      [order_id, authResult.user.userId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (orderResult.rows[0].order_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'INVALID_ORDER_STATUS' },
        { status: 400 }
      );
    }

    const orderItemResult = await query(
      `SELECT quantity FROM order_items WHERE order_id = ? AND product_id = ?`,
      [order_id, product_id]
    );

    if (orderItemResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ORDER_ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (Number(orderItemResult.rows[0].quantity) !== Number(quantity)) {
      return NextResponse.json(
        { success: false, error: 'QUANTITY_MISMATCH' },
        { status: 400 }
      );
    }

    logMonitor('ORDERS', 'INFO', {
      action: 'CALCULATE_QUICK_ORDER',
      productId: product_id,
      orderId: order_id,
      quantity,
      addressId: address_id,
      couponIds: coupon_ids,
      paymentMethod: payment_method
    });

    const pricing = await estimateOrderPricing({
      orderId: Number(order_id),
      userId: authResult.user.userId,
      addressId: address_id,
      couponIds: coupon_ids || [],
    });

    const productPricing = pricing.items.find((item) => item.product_id === Number(product_id));
    const productPromotions = await calculateProductPromotions(product_id);
    const appliedPromotions = buildAppliedPromotions(productPricing, productPromotions);

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'CALCULATE_QUICK_ORDER',
      productId: product_id,
      orderId: order_id,
      quantity,
      totalOriginalPrice: pricing.total_original_price,
      promotionsDiscount: pricing.total_promotions_discount_amount,
      couponDiscount: pricing.total_coupon_discount,
      shippingFee: pricing.shipping_fee,
      finalAmount: pricing.final_amount
    });

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product_id,
          price_usd: productPricing?.final_price_usd || 0,
          original_price_usd: productPricing?.original_price_usd || 0,
          quantity
        },
        total_original_price: pricing.total_original_price,
        total_promotions_discount_amount: pricing.total_promotions_discount_amount,
        total_after_promotions_amount: pricing.total_after_promotions_amount,
        total_coupon_discount: pricing.total_coupon_discount,
        order_final_discount_amount: pricing.order_final_discount_amount,
        shipping_fee: pricing.shipping_fee,
        final_amount: pricing.final_amount,
        total_usd: pricing.total_usd,
        total_cny: pricing.total_cny,
        total_aed: pricing.total_aed,
        display_currency: 'USD',
        display_total: pricing.total_usd,
        address: pricing.address,
        coupon_details: pricing.coupon_details,
        coupon: coupon_ids && coupon_ids.length > 0 ? {
          ids: coupon_ids,
          discount: pricing.total_coupon_discount,
          details: pricing.coupon_details
        } : undefined,
        promotions: appliedPromotions,
        product_promotions: productPromotions,
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
