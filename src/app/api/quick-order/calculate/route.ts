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
  const productResult = await query(
    `SELECT pp_usd.price as price_usd
    FROM product_prices pp_usd
    WHERE pp_usd.product_id = ? AND pp_usd.currency = 'USD'`,
    [productId]
  );

  if (productResult.rows.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }

  const originalPriceUSD = round2(parseFloat(productResult.rows[0].price_usd) || 0);

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

  return promoResult.rows.map((promotion: any) => ({
    id: promotion.promo_id,
    name: promotion.promo_name || '促销活动',
    discount: round2(originalPriceUSD * promotion.discount_percent / 100),
    percent: round2(parseFloat(promotion.discount_percent) || 0)
  }));
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
    const promotions = await calculateProductPromotions(product_id);

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
