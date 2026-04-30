import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') || 
         request.nextUrl.searchParams.get('lang') || 
         'zh';
}

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult.response) {
    return authResult.response;
  }
  const userId = authResult.user.userId;
  const lang = getLangFromRequest(request);

  logMonitor('CART_COUPONS', 'REQUEST', { userId });

  try {
    const userCouponsResult = await query(`
      SELECT 
        uc.id,
        uc.coupon_id,
        uc.claimed_at,
        uc.used_at,
        uc.order_id,
        c.code,
        c.name,
        c.name_en,
        c.name_ar,
        c.type,
        c.value,
        c.min_purchase,
        c.start_date,
        c.end_date,
        c.is_active,
        CASE 
          WHEN uc.used_at IS NOT NULL THEN 'used'
          WHEN c.end_date < datetime('now') THEN 'expired'
          ELSE 'available'
        END as status
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ?
      ORDER BY uc.claimed_at DESC
    `, [userId]);

    const availableCoupons: any[] = [];
    const usedCoupons: any[] = [];
    const expiredCoupons: any[] = [];
    const claimableCoupons: any[] = [];

    const now = new Date();
    const userCouponIds = new Set(userCouponsResult.rows.map((r: any) => r.coupon_id));

    for (const row of userCouponsResult.rows as any[]) {
      const coupon = {
        id: row.id,
        coupon_id: row.coupon_id,
        code: row.code,
        name: lang === 'zh' ? row.name : lang === 'ar' ? row.name_ar : row.name_en,
        type: row.type,
        value: row.value,
        min_purchase: row.min_purchase,
        start_date: row.start_date,
        end_date: row.end_date,
        claimed_at: row.claimed_at,
        used_at: row.used_at,
        order_id: row.order_id,
        is_expired: row.status === 'expired'
      };

      if (row.status === 'used') {
        usedCoupons.push(coupon);
      } else if (row.status === 'expired') {
        expiredCoupons.push(coupon);
      } else {
        availableCoupons.push(coupon);
      }
    }

    const claimableResult = await query(`
      SELECT * FROM coupons
      WHERE is_active = 1
      AND end_date >= datetime('now')
      AND id NOT IN (SELECT coupon_id FROM user_coupons WHERE user_id = ?)
      ORDER BY end_date ASC
    `, [userId]);

    for (const row of claimableResult.rows as any[]) {
      claimableCoupons.push({
        id: null,
        coupon_id: row.id,
        code: row.code,
        name: lang === 'zh' ? row.name : lang === 'ar' ? row.name_ar : row.name_en,
        type: row.type,
        value: row.value,
        min_purchase: row.min_purchase,
        start_date: row.start_date,
        end_date: row.end_date,
        claimed_at: null,
        used_at: null,
        order_id: null,
        is_expired: false
      });
    }

    const unavailableCoupons: any[] = [];

    logMonitor('CART_COUPONS', 'SUCCESS', {
      userId,
      available: availableCoupons.length,
      used: usedCoupons.length,
      expired: expiredCoupons.length,
      claimable: claimableCoupons.length
    });

    return NextResponse.json({
      success: true,
      data: {
        coupons: {
          available: availableCoupons,
          unavailable: unavailableCoupons,
          used: usedCoupons,
          expired: expiredCoupons,
          claimable: claimableCoupons
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cart coupons:', error);
    logMonitor('CART_COUPONS', 'ERROR', { userId, error: String(error) });
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch coupons'
    }, { status: 500 });
  }
}
