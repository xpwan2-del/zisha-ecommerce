import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { OrderStatusService } from '@/lib/order-status-service';

/**
 * ============================================================
 * 快速订单更新（提交订单）
 * ============================================================
 *
 * @api {POST} /api/quick-order/create 更新快速订单
 * @apiName UpdateQuickOrder
 * @apiGroup ORDERS
 * @apiDescription 快速订单页选择地址/优惠券/支付方式后，点击"立即购买"提交订单
 *
 * **业务逻辑：**
 * 1. 验证用户登录状态
 * 2. 验证订单是否存在且属于当前用户
 * 3. 验证收货地址
 * 4. 计算运费
 * 5. 应用优惠券折扣（如有）
 * 6. 更新订单（地址、优惠券、支付方式、运费、最终金额）
 * 7. 记录订单状态变更
 * 8. 返回支付数据
 *
 * **注意：**
 * - 此接口是 UPDATE，不是 INSERT
 * - 订单在步骤1已创建（/api/inventory/reserve）
 * - 此接口只更新已有订单的信息
 *
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)，可选，默认 zh
 *
 * @apiBody {Number} order_id 订单ID，必需
 * @apiBody {Number} address_id 收货地址ID，必需
 * @apiBody {String} payment_method 支付方式 (paypal/alipay)，必需
 * @apiBody {Number[]} [coupon_ids] 优惠券ID数组（支持多券叠加），可选
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回支付数据
 * @apiSuccess {Number} data.order_id 订单ID
 * @apiSuccess {String} data.order_number 订单号
 * @apiSuccess {String} data.payment_method 支付方式
 * @apiSuccess {Number} data.amount_aed 最终金额（AED）
 * @apiSuccess {Number} data.amount_usd 最终金额（USD）
 * @apiSuccess {Number} data.amount_cny 最终金额（CNY）
 *
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "order_id": 15,
 *         "order_number": "QO1234567890123",
 *         "payment_method": "paypal",
 *         "amount_aed": 299.00,
 *         "amount_usd": 81.33,
 *         "amount_cny": 584.82
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录
 * @apiError {String} MISSING_PARAMS 缺少必需参数
 * @apiError {String} VALIDATION_FAILED 参数校验失败
 * @apiError {String} ORDER_NOT_FOUND 订单不存在
 * @apiError {String} ADDRESS_NOT_FOUND 收货地址不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 *
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "success": false,
 *       "error": "ORDER_NOT_FOUND",
 *       "message": "订单不存在"
 *     }
 */

// ============================================================
// 辅助函数
// ============================================================

/**
 * getLangFromRequest - 从请求获取语言设置
 * @description 优先从请求头 x-lang 获取，其次从 cookie 获取，默认 zh
 */
function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

/**
 * createErrorResponse - 创建统一错误响应
 * @param error 错误码
 * @param lang 语言
 * @param status HTTP 状态码
 */
function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

/**
 * createSuccessResponse - 创建统一成功响应
 * @param data 返回数据
 * @param status HTTP 状态码
 */
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

/**
 * calculateShipping - 计算运费
 * @param city 城市
 * @returns 运费金额
 */
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

/**
 * @param subtotal 小计金额
 * @returns 折扣金额、最终金额、优惠券代码
 */
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
    discount = subtotal * (parseFloat(coupon.value) / 100);
  } else if (coupon.type === 'fixed') {
    discount = parseFloat(coupon.value);
  }

  discount = Math.min(discount, subtotal);
  const finalAmount = Math.max(0, subtotal - discount);

  return { discount, finalAmount, couponCode: coupon.code };
}

// ============================================================
// 接口实现
// ============================================================

interface UpdateOrderRequest {
  order_id: number;
  address_id: number;
  coupon_ids?: number[];
  payment_method: 'paypal' | 'alipay';
  order_final_discount_amount?: number;
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/quick-order/create',
    lang
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('ORDERS', 'AUTH_FAILED', {
        reason: 'Unauthorized'
      });
      return authResult.response;
    }

    const body: UpdateOrderRequest = await request.json();
    const { order_id, address_id, coupon_ids, payment_method, order_final_discount_amount } = body;
    const userId = authResult.user.userId;

    if (!order_id || !address_id || !payment_method) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Missing required params: order_id, address_id, payment_method',
        order_id,
        address_id,
        payment_method
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    if (!['paypal', 'alipay'].includes(payment_method)) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Invalid payment method: only paypal and alipay are supported',
        payment_method
      });
      return createErrorResponse('VALIDATION_FAILED', lang, 400);
    }

    logMonitor('ORDERS', 'INFO', {
      action: 'UPDATE_QUICK_ORDER',
      userId,
      orderId: order_id,
      addressId: address_id,
      paymentMethod: payment_method,
      couponIds: coupon_ids
    });

    const orderResult = await query(
      `SELECT id, order_number, total_amount, total_original_price, order_final_discount_amount,
              final_amount, shipping_address_id, shipping_fee, order_status
       FROM orders WHERE id = ? AND user_id = ?`,
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('ORDERS', 'NOT_FOUND', {
        reason: 'Order not found',
        order_id,
        userId
      });
      return createErrorResponse('ORDER_NOT_FOUND', lang, 404);
    }

    const order = orderResult.rows[0];

    if (order.order_status !== 'pending') {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Order status is not pending',
        order_id,
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

    const subtotal = order.total_amount || 0;
    let couponDiscount = 0;
    let couponIdsJson = '[]';

    if (coupon_ids && coupon_ids.length > 0) {
      for (const couponId of coupon_ids) {
        const { discount } = await applyCouponDiscount(couponId, userId, subtotal);
        couponDiscount += discount;
      }
      couponIdsJson = JSON.stringify(coupon_ids);
    }

    const finalAmount = subtotal + shippingFee - couponDiscount;
    const finalDiscountAmount = order_final_discount_amount ?? (productDiscount + couponDiscount);

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
        finalDiscountAmount,
        finalAmount,
        order_id,
        userId
      ]
    );

    if (coupon_ids && coupon_ids.length > 0) {
      for (const couponId of coupon_ids) {
        await query(
          `UPDATE user_coupons SET status = 'used' WHERE id = ? AND user_id = ?`,
          [couponId, userId]
        );
        await query(
          `INSERT INTO order_coupons (order_id, coupon_id, user_id, discount_applied, status, applied_at)
           VALUES (?, ?, ?, ?, 'applied', datetime('now'))`,
          [order_id, couponId, userId, couponDiscount / coupon_ids.length]
        );
      }
    }

    const totalUSD = finalAmount * 0.2722;
    const totalCNY = finalAmount * 1.9558;

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'UPDATE_QUICK_ORDER',
      orderId: order_id,
      orderNumber: order.order_number,
      addressId: address_id,
      paymentMethod: payment_method,
      shippingFee,
      couponDiscount,
      finalAmount
    });

    return createSuccessResponse({
      order_id,
      order_number: order.order_number,
      payment_method,
      amount_aed: finalAmount,
      amount_usd: totalUSD,
      amount_cny: totalCNY
    });

  } catch (error) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'UPDATE_QUICK_ORDER',
      error: String(error)
    });
    console.error('Error in quick-order update API:', error);
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}