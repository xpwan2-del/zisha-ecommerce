import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { estimateOrderPricing } from '@/lib/order-pricing-service';

/**
 * ============================================================
 * 订单价格估算 API
 * ============================================================
 *
 * @api {POST} /api/orders/[id]/estimate 订单价格估算
 * @apiName EstimateOrder
 * @apiGroup ORDERS
 * @apiDescription 订单详情页选择地址/优惠券后，实时计算价格预览（只读，不修改订单）
 *
 * **业务逻辑：**
 * 1. 验证用户登录状态
 * 2. 验证订单是否存在且属于当前用户
 * 3. 验证订单状态为 pending
 * 4. 根据地址计算运费
 * 5. 根据优惠券计算折扣
 * 6. 返回价格明细（不修改订单）
 *
 * @apiHeader {String} Authorization Bearer Token
 *
 * @apiParam {Number} address_id 收货地址ID
 * @apiParam {Array} [coupon_ids] 用户优惠券ID数组（user_coupons.id）
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 价格预览数据
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

// ============================================================
// POST - 订单价格估算
// ============================================================

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/orders/[id]/estimate'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('ORDERS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const userId = authResult.user.userId;
    const urlParts = new URL(request.url).pathname.split('/');
    const orderId = urlParts[urlParts.indexOf('orders') + 1];

    const body = await request.json();
    const { address_id, coupon_ids } = body;

    if (!orderId || !address_id) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Missing required params: order_id, address_id',
        orderId,
        address_id
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    logMonitor('ORDERS', 'INFO', {
      action: 'ESTIMATE_ORDER',
      userId,
      orderId,
      addressId: address_id,
      couponIds: coupon_ids
    });

    // 验证订单存在且属于当前用户
    const orderResult = await query(
      `SELECT id, order_number, total_after_promotions_amount, total_original_price, order_status
       FROM orders WHERE id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('ORDERS', 'NOT_FOUND', {
        reason: 'Order not found',
        orderId,
        userId
      });
      return createErrorResponse('ORDER_NOT_FOUND', lang, 404);
    }

    const order = orderResult.rows[0];

    if (order.order_status !== 'pending') {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Order status is not pending',
        orderId,
        orderStatus: order.order_status
      });
      return createErrorResponse('VALIDATION_FAILED', lang, 400);
    }

    // 验证地址存在
    const addressResult = await query(`
      SELECT id, contact_name, phone, street_address, city, country_name
      FROM addresses
      WHERE id = ? AND user_id = ?
    `, [address_id, userId]);

    if (addressResult.rows.length === 0) {
      logMonitor('ORDERS', 'NOT_FOUND', {
        reason: 'Address not found',
        address_id,
        userId
      });
      return createErrorResponse('ADDRESS_NOT_FOUND', lang, 404);
    }

    const pricing = await estimateOrderPricing({
      orderId: Number(orderId),
      userId,
      addressId: address_id,
      couponIds: coupon_ids || [],
    });

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'ESTIMATE_ORDER',
      orderId,
      addressId: address_id,
      shippingFee: pricing.shipping_fee,
      promotionsDiscount: pricing.total_promotions_discount_amount,
      couponDiscount: pricing.total_coupon_discount,
      finalAmount: pricing.final_amount
    });

    return createSuccessResponse({
      order_id: Number(orderId),
      order_number: order.order_number,
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
      address: pricing.address,
      coupon_details: pricing.coupon_details,
      promotions: pricing.promotions,
      coupon: coupon_ids && coupon_ids.length > 0 ? {
        ids: coupon_ids,
        discount: pricing.total_coupon_discount,
        details: pricing.coupon_details
      } : undefined
    });

  } catch (error) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'ESTIMATE_ORDER',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}