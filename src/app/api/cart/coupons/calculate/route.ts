import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 购物车优惠券计算
 * ============================================================
 *
 * @api {POST} /api/cart/coupons/calculate 计算购物车优惠券折扣
 * @apiName CalculateCartCoupons
 * @apiGroup CART
 * @apiDescription 计算选中优惠券的折扣金额，支持多券叠加计算
 *
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiBody {Number[]} coupon_ids 优惠券ID数组
 * @apiBody {Number} subtotal_usd 小计金额（USD）
 * @apiBody {Number} subtotal_cny 小计金额（CNY）
 * @apiBody {Number} subtotal_aed 小计金额（AED）
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "coupon_discount_usd": 28.72,
 *         "coupon_discount_cny": 206.49,
 *         "coupon_discount_aed": 105.51,
 *         "total_usd": 258.47,
 *         "total_cny": 1858.41,
 *         "total_aed": 949.63
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

async function applyMultipleCoupons(
  couponIds: number[],
  subtotalUSD: number,
  subtotalCNY: number,
  subtotalAED: number,
  userId: number
): Promise<{
  totalDiscountUSD: number;
  totalDiscountCNY: number;
  totalDiscountAED: number;
  couponDetails: Array<{ id: number; discount: number; code: string; type: string; value: number }>;
}> {
  if (!couponIds || couponIds.length === 0) {
    return { totalDiscountUSD: 0, totalDiscountCNY: 0, totalDiscountAED: 0, couponDetails: [] };
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
        AND (c.is_permanent = 1 OR datetime('now') < uc.expires_at)
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

  let remainingSubtotalUSD = subtotalUSD;
  let remainingSubtotalCNY = subtotalCNY;
  let remainingSubtotalAED = subtotalAED;
  let totalDiscountUSD = 0;
  let totalDiscountCNY = 0;
  let totalDiscountAED = 0;

  if (percentageCoupons.length > 0) {
    const multiplierUSD = percentageCoupons.reduce((acc, c) => acc * (1 - c.value / 100), 1);
    const afterPercentageUSD = subtotalUSD * multiplierUSD;
    const percentageDiscountUSD = subtotalUSD - afterPercentageUSD;

    const multiplierCNY = percentageCoupons.reduce((acc, c) => acc * (1 - c.value / 100), 1);
    const afterPercentageCNY = subtotalCNY * multiplierCNY;
    const percentageDiscountCNY = subtotalCNY - afterPercentageCNY;

    const multiplierAED = percentageCoupons.reduce((acc, c) => acc * (1 - c.value / 100), 1);
    const afterPercentageAED = subtotalAED * multiplierAED;
    const percentageDiscountAED = subtotalAED - afterPercentageAED;

    const totalPercentageValue = percentageCoupons.reduce((acc, c) => acc + c.value, 0);

    for (const c of percentageCoupons) {
      const discountUSD = totalPercentageValue > 0
        ? percentageDiscountUSD * (c.value / totalPercentageValue)
        : 0;
      const discountCNY = totalPercentageValue > 0
        ? percentageDiscountCNY * (c.value / totalPercentageValue)
        : 0;
      const discountAED = totalPercentageValue > 0
        ? percentageDiscountAED * (c.value / totalPercentageValue)
        : 0;

      totalDiscountUSD += discountUSD;
      totalDiscountCNY += discountCNY;
      totalDiscountAED += discountAED;
      remainingSubtotalUSD = afterPercentageUSD;
      remainingSubtotalCNY = afterPercentageCNY;
      remainingSubtotalAED = afterPercentageAED;
      couponDetails.push({
        id: c.id,
        discount: Math.round(discountUSD * 100) / 100,
        code: c.code,
        type: 'percentage',
        value: c.value
      });
    }
  }

  if (fixedCoupons.length > 0) {
    for (const c of fixedCoupons) {
      const discountUSD = Math.min(c.value, remainingSubtotalUSD);
      const discountCNY = Math.min(c.value, remainingSubtotalCNY);
      const discountAED = Math.min(c.value, remainingSubtotalAED);

      totalDiscountUSD += discountUSD;
      totalDiscountCNY += discountCNY;
      totalDiscountAED += discountAED;
      remainingSubtotalUSD -= discountUSD;
      remainingSubtotalCNY -= discountCNY;
      remainingSubtotalAED -= discountAED;
      couponDetails.push({
        id: c.id,
        discount: Math.round(discountUSD * 100) / 100,
        code: c.code,
        type: 'fixed',
        value: c.value
      });
    }
  }

  return {
    totalDiscountUSD: Math.round(totalDiscountUSD * 100) / 100,
    totalDiscountCNY: Math.round(totalDiscountCNY * 100) / 100,
    totalDiscountAED: Math.round(totalDiscountAED * 100) / 100,
    couponDetails
  };
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'POST',
    path: '/api/cart/coupons/calculate'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const userId = authResult.user?.userId;
    const body = await request.json();
    const { coupon_ids, subtotal_usd, subtotal_cny, subtotal_aed } = body;

    if (!subtotal_usd && !subtotal_cny && !subtotal_aed) {
      return NextResponse.json(
        { success: false, error: 'Missing subtotal amounts' },
        { status: 400 }
      );
    }

    const subUSD = parseFloat(subtotal_usd) || 0;
    const subCNY = parseFloat(subtotal_cny) || 0;
    const subAED = parseFloat(subtotal_aed) || 0;

    logMonitor('CART', 'INFO', {
      action: 'CALCULATE_COUPONS',
      userId,
      couponIds: coupon_ids,
      subtotalUSD: subUSD,
      subtotalCNY: subCNY,
      subtotalAED: subAED
    });

    const { totalDiscountUSD, totalDiscountCNY, totalDiscountAED, couponDetails } =
      await applyMultipleCoupons(coupon_ids || [], subUSD, subCNY, subAED, userId);

    const totalUSD = Math.max(0, subUSD - totalDiscountUSD);
    const totalCNY = Math.max(0, subCNY - totalDiscountCNY);
    const totalAED = Math.max(0, subAED - totalDiscountAED);

    logMonitor('CART', 'SUCCESS', {
      action: 'CALCULATE_COUPONS',
      userId,
      couponDiscountUSD: totalDiscountUSD,
      couponDiscountCNY: totalDiscountCNY,
      couponDiscountAED: totalDiscountAED,
      totalUSD,
      totalCNY,
      totalAED,
      couponsApplied: couponDetails.length
    });

    return NextResponse.json({
      success: true,
      data: {
        coupon_discount_usd: totalDiscountUSD,
        coupon_discount_cny: totalDiscountCNY,
        coupon_discount_aed: totalDiscountAED,
        total_usd: Math.round(totalUSD * 100) / 100,
        total_cny: Math.round(totalCNY * 100) / 100,
        total_aed: Math.round(totalAED * 100) / 100,
        coupon_details: couponDetails
      }
    });
  } catch (error) {
    console.error('Error calculating coupons:', error);
    logMonitor('CART', 'ERROR', {
      action: 'CALCULATE_COUPONS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to calculate coupons' },
      { status: 500 }
    );
  }
}