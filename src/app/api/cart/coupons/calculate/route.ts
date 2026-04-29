import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

async function applyMultipleCoupons(
  couponIds: number[],
  subtotal: number,
  userId: number
): Promise<{ totalDiscount: number; couponDetails: Array<{ id: number; discount: number; code: string; type: string; value: number }> }> {
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

  if (percentageCoupons.length > 0) {
    const multiplier = percentageCoupons.reduce((acc, c) => acc * (1 - c.value / 100), 1);
    const afterPercentage = subtotal * multiplier;
    const percentageDiscount = subtotal - afterPercentage;

    const totalPercentageValue = percentageCoupons.reduce((acc, c) => acc + c.value, 0);

    for (const c of percentageCoupons) {
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
  logMonitor('CART', 'REQUEST', { method: 'POST', path: '/api/cart/coupons/calculate' });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) return authResult.response;

    const body = await request.json();
    const { coupon_ids, subtotal_usd, subtotal_cny, subtotal_aed } = body || {};

    const couponIds = Array.isArray(coupon_ids) ? coupon_ids.map((n: any) => parseInt(n, 10)).filter((n: any) => Number.isFinite(n)) : [];
    const subtotalUsd = parseFloat(subtotal_usd) || 0;
    const subtotalCny = parseFloat(subtotal_cny) || 0;
    const subtotalAed = parseFloat(subtotal_aed) || 0;

    const userId = authResult.user.userId;
    const { totalDiscount, couponDetails } = await applyMultipleCoupons(couponIds, subtotalUsd, userId);

    const discount = Math.min(totalDiscount, subtotalUsd);
    const totalUsd = Math.max(0, subtotalUsd - discount);
    const totalCny = Math.max(0, subtotalCny - discount);
    const totalAed = Math.max(0, subtotalAed - discount);

    return NextResponse.json({
      success: true,
      data: {
        coupon_discount_usd: discount,
        coupon_discount_cny: discount,
        coupon_discount_aed: discount,
        total_usd: totalUsd,
        total_cny: totalCny,
        total_aed: totalAed,
        coupon: {
          ids: couponIds,
          discount,
          details: couponDetails
        }
      }
    });
  } catch (error) {
    console.error('Error calculating cart coupon:', error);
    logMonitor('CART', 'ERROR', { action: 'CALCULATE_CART_COUPON', error: String(error) });
    return NextResponse.json({ success: false, error: 'Failed to calculate coupon' }, { status: 500 });
  }
}

