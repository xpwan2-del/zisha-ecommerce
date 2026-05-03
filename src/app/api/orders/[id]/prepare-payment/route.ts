import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 订单准备支付 API
 * ============================================================
 *
 * @api {POST} /api/orders/[id]/prepare-payment 准备支付
 * @apiName PreparePayment
 * @apiGroup ORDERS
 * @apiDescription 订单详情页选择地址/优惠券/支付方式后，重新计算价格并更新订单
 *
 * **业务逻辑：**
 * 1. 验证用户登录状态
 * 2. 验证订单是否存在且属于当前用户
 * 3. 验证订单状态为 pending
 * 4. 验证收货地址
 * 5. 计算运费
 * 6. 应用优惠券折扣（如有）
 * 7. 更新订单（地址、优惠券、支付方式、运费、最终金额）
 * 8. 标记优惠券为已使用
 * 9. 返回支付数据
 *
 * @apiHeader {String} Authorization Bearer Token
 *
 * @apiParam {Number} address_id 收货地址ID
 * @apiParam {Array} [coupon_ids] 用户优惠券ID数组（user_coupons.id）
 * @apiParam {String} payment_method 支付方式 (paypal|alipay|stripe)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 支付数据
 * @apiSuccessExample {json} Success-Response:
 *     {"success":true,"data":{"order_id":1,"order_number":"ORD...","payment_method":"paypal",...}}
 */

// ============================================================
// 辅助函数
// ============================================================

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
  couponCode?: string
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
    couponCode: coupon.code
  };
}

// ============================================================
// POST - 准备支付
// ============================================================

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/orders/[id]/prepare-payment'
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
    const { address_id, coupon_ids, payment_method } = body;

    if (!orderId || !address_id || !payment_method) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Missing required params: order_id, address_id, payment_method',
        orderId,
        address_id,
        payment_method
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    if (!['paypal', 'alipay', 'stripe'].includes(payment_method)) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Invalid payment method',
        payment_method
      });
      return createErrorResponse('VALIDATION_FAILED', lang, 400);
    }

    logMonitor('ORDERS', 'INFO', {
      action: 'PREPARE_PAYMENT',
      userId,
      orderId,
      addressId: address_id,
      paymentMethod: payment_method,
      couponIds: coupon_ids
    });

    const orderResult = await query(
      `SELECT id, order_number, total_after_promotions_amount, total_original_price, order_final_discount_amount,
              final_amount, shipping_address_id, shipping_fee, order_status
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
    const shippingFee = await calculateShipping(address.city);

    const subtotal = Number(order.total_after_promotions_amount) || 0;
    const originalTotal = Number(order.total_original_price) || 0;
    const productDiscount = Math.max(0, originalTotal - subtotal);
    let couponDiscount = 0;
    let couponIdsJson = '[]';

    if (coupon_ids && coupon_ids.length > 0) {
      for (const couponId of coupon_ids) {
        const { discount } = await applyCouponDiscount(couponId, userId, subtotal);
        couponDiscount += discount;
      }
      couponDiscount = Math.min(couponDiscount, subtotal);
      couponIdsJson = JSON.stringify(coupon_ids);
    }

    const totalDiscount = productDiscount + couponDiscount;

    const finalAmount = Math.max(0, subtotal - couponDiscount + shippingFee);

    await query(
      `UPDATE orders SET 
        payment_method = ?,
        shipping_address_id = ?,
        shipping_fee = ?,
        coupon_ids = ?,
        total_coupon_discount = ?,
        order_final_discount_amount = ?,
        final_amount = ?,
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [
        payment_method,
        address_id,
        shippingFee,
        couponIdsJson,
        couponDiscount,
        totalDiscount,
        finalAmount,
        orderId,
        userId
      ]
    );

    if (coupon_ids && coupon_ids.length > 0) {
      for (const couponId of coupon_ids) {
        await query(
          `UPDATE user_coupons SET status = 'used', used_order_id = ? WHERE id = ? AND user_id = ?`,
          [orderId, couponId, userId]
        );
        await query(
          `INSERT INTO order_coupons (order_id, coupon_id, user_id, discount_applied, status, applied_at)
           VALUES (?, ?, ?, ?, 'applied', datetime('now'))`,
          [orderId, couponId, userId, couponDiscount / coupon_ids.length]
        );
      }
    }

    const itemsResult = await query(
      `SELECT oi.product_id, p.name as product_name, oi.quantity, 
              COALESCE(oi.total_promotions_discount_amount, 0) as total_promotions_discount_amount,
              oi.original_price
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const items = itemsResult.rows.map((item: any) => ({
      product_id: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      unit_amount: item.original_price,
      original_price: item.original_price
    }));

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'PREPARE_PAYMENT',
      orderId,
      orderNumber: order.order_number,
      addressId: address_id,
      paymentMethod: payment_method,
      shippingFee,
      productDiscount,
      couponDiscount,
      totalDiscount,
      finalAmount
    });

    return createSuccessResponse({
      order_id: Number(orderId),
      order_number: order.order_number,
      payment_method,
      shipping_fee: shippingFee,
      product_discount: productDiscount,
      coupon_discount: couponDiscount,
      total_discount: totalDiscount,
      final_amount: finalAmount,
      subtotal,
      original_total: originalTotal,
      address: {
        id: address.id,
        contact_name: address.contact_name,
        phone: address.phone,
        street_address: address.street_address,
        city: address.city,
        country_name: address.country_name
      },
      coupons: coupon_ids || [],
      items
    });

  } catch (error) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'PREPARE_PAYMENT',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
