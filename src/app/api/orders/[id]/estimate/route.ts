import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

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

async function calculateShipping(city: string): Promise<number> {
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

async function applyCouponDiscount(couponId: number, userId: number, subtotal: number): Promise<{
  discount: number;
  finalAmount: number;
  couponCode?: string;
  couponType?: string;
  couponValue?: number;
}> {
  const couponResult = await query(`
    SELECT c.type, c.value, c.code
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'active'
      AND datetime('now') < uc.expires_at
      AND c.is_active = 1
  `, [couponId, userId]);

  if (couponResult.rows.length === 0) {
    return { discount: 0, finalAmount: subtotal };
  }

  const coupon = couponResult.rows[0];
  let discount = 0;

  if (coupon.type === 'percentage') {
    discount = subtotal * (coupon.value / 100);
  } else if (coupon.type === 'fixed') {
    discount = coupon.value;
  }

  discount = Math.min(discount, subtotal);
  const finalAmount = Math.max(0, subtotal - discount);

  return {
    discount,
    finalAmount,
    couponCode: coupon.code,
    couponType: coupon.type,
    couponValue: coupon.value
  };
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

    const address = addressResult.rows[0];

    // 计算运费
    const shippingFee = await calculateShipping(address.city);

    // 计算价格
    const subtotal = Number(order.total_after_promotions_amount) || 0;
    const originalTotal = Number(order.total_original_price) || 0;
    const productDiscount = Math.max(0, originalTotal - subtotal);

    let couponDiscount = 0;
    let couponDetails: Array<{
      id: number;
      discount: number;
      code: string;
      type: 'percentage' | 'fixed';
      value: number;
    }> = [];

    if (coupon_ids && coupon_ids.length > 0) {
      for (const couponId of coupon_ids) {
        const { discount, couponCode, couponType, couponValue } = await applyCouponDiscount(couponId, userId, subtotal);
        couponDiscount += discount;
        couponDetails.push({
          id: couponId,
          discount,
          code: couponCode || '',
          type: couponType as 'percentage' | 'fixed',
          value: couponValue || 0
        });
      }
      couponDiscount = Math.min(couponDiscount, subtotal);
    }

    const finalAmount = Math.max(0, subtotal - couponDiscount + shippingFee);

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'ESTIMATE_ORDER',
      orderId,
      addressId: address_id,
      shippingFee,
      productDiscount,
      couponDiscount,
      finalAmount
    });

    return createSuccessResponse({
      order_id: Number(orderId),
      order_number: order.order_number,
      subtotal,
      original_total: originalTotal,
      product_discount: productDiscount,
      coupon_discount: couponDiscount,
      shipping_fee: shippingFee,
      final_amount: finalAmount,
      total_usd: finalAmount,
      total_cny: finalAmount * 7.32,
      total_aed: finalAmount * 3.67,
      address: {
        id: address.id,
        contact_name: address.contact_name,
        phone: address.phone,
        street_address: address.street_address,
        city: address.city,
        country_name: address.country_name
      },
      coupon: coupon_ids && coupon_ids.length > 0 ? {
        ids: coupon_ids,
        discount: couponDiscount,
        details: couponDetails
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