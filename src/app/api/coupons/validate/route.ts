import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 优惠券验证
 * ============================================================
 *
 * @api {POST} /api/coupons/validate 验证优惠券
 * @apiName ValidateCoupon
 * @apiGroup PROMOTIONS
 * @apiDescription 验证用户输入的优惠券码是否有效，并计算折扣金额
 *
 * @apiHeader {String} x-user-id 用户ID
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {String} coupon_code 优惠券码
 * @apiParam {Number} order_amount 订单金额（促销后价格）
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} COUPON_NOT_FOUND 优惠券不存在
 * @apiError {String} COUPON_NOT_STARTED 优惠券未开始
 * @apiError {String} COUPON_EXPIRED 优惠券已过期
 * @apiError {String} COUPON_NOT_OWNED 用户未领取该优惠券
 * @apiError {String} USER_COUPON_EXPIRED 用户优惠券已过期
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

export async function POST(request: NextRequest) {
  logMonitor('PROMOTIONS', 'REQUEST', {
    method: 'POST',
    path: '/api/coupons/validate'
  });

  try {
    const userId = request.headers.get('x-user-id');
    const lang = getLangFromRequest(request);
    const body = await request.json();
    const { coupon_code, order_amount } = body;

    if (!userId) {
      logMonitor('PROMOTIONS', 'AUTH_FAILED', { reason: 'User not authenticated' });
      return createErrorResponse('UNAUTHORIZED', 401);
    }

    if (!coupon_code) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Missing required field: coupon_code'
      });
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (!order_amount || order_amount <= 0) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Invalid order_amount',
        order_amount
      });
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    logMonitor('PROMOTIONS', 'INFO', {
      action: 'VALIDATE_COUPON',
      userId,
      couponCode: coupon_code,
      orderAmount: order_amount
    });

    const couponResult = await query(`
      SELECT * FROM coupons
      WHERE code = ? AND is_active = 1
    `, [coupon_code]);

    if (couponResult.rows.length === 0) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Coupon not found',
        couponCode: coupon_code
      });
      return createErrorResponse('COUPON_NOT_FOUND', 400);
    }

    const coupon = couponResult.rows[0];

    if (new Date() < new Date(coupon.start_date)) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Coupon not yet available',
        couponCode: coupon_code,
        startDate: coupon.start_date
      });
      return createErrorResponse('COUPON_NOT_STARTED', 400);
    }

    if (new Date() > new Date(coupon.end_date)) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Coupon has expired',
        couponCode: coupon_code,
        endDate: coupon.end_date
      });
      return createErrorResponse('COUPON_EXPIRED', 400);
    }

    const userCouponResult = await query(`
      SELECT * FROM user_coupons
      WHERE user_id = ? AND coupon_id = ? AND status = 'active'
    `, [userId, coupon.id]);

    if (userCouponResult.rows.length === 0) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'User does not have this coupon or already used',
        userId,
        couponId: coupon.id
      });
      return createErrorResponse('COUPON_NOT_OWNED', 400);
    }

    const userCoupon = userCouponResult.rows[0];

    if (!coupon.is_permanent && new Date() > new Date(userCoupon.expires_at)) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'User coupon has expired',
        userId,
        couponId: coupon.id,
        expiresAt: userCoupon.expires_at
      });
      return createErrorResponse('USER_COUPON_EXPIRED', 400);
    }

    let discount = 0;
    const orderAmount = parseFloat(order_amount);

    if (coupon.type === 'fixed') {
      discount = parseFloat(coupon.value);
    } else if (coupon.type === 'percentage') {
      discount = orderAmount * (parseFloat(coupon.value) / 100);
    }

    discount = Math.min(discount, orderAmount);
    const finalAmount = orderAmount - discount;

    logMonitor('PROMOTIONS', 'SUCCESS', {
      action: 'VALIDATE_COUPON',
      userId,
      couponCode: coupon_code,
      discount,
      originalAmount: order_amount,
      finalAmount: finalAmount,
      isStackable: coupon.is_stackable
    });

    return createSuccessResponse({
      valid: true,
      coupon_id: coupon.id,
      user_coupon_id: userCoupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      discount: discount,
      original_amount: order_amount,
      final_amount: finalAmount,
      is_stackable: coupon.is_stackable === 1,
      is_permanent: coupon.is_permanent === 1
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    logMonitor('PROMOTIONS', 'ERROR', {
      action: 'VALIDATE_COUPON',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
