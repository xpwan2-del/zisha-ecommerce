import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

interface CouponItem {
  id: number;
  coupon_id: number;
  code: string;
  name: string;
  type: string;
  discount_type: string;
  value: number;
  is_stackable: number;
  permanent_days: number;
  description: string;
  expires_at: string;
}

async function getUserCoupons(userId: string) {
  const couponsResult = await query(`
    SELECT
      uc.id as user_coupon_id,
      c.id as coupon_id,
      c.code,
      c.name,
      c.type,
      c.value,
      c.is_stackable,
      c.permanent_days,
      c.description,
      uc.expires_at
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
      AND uc.status = 'active'
      AND (c.is_permanent = 1 OR datetime('now') < uc.expires_at)
      AND (c.is_permanent = 1 OR datetime('now') < c.end_date)
      AND c.is_active = 1
    ORDER BY uc.id DESC
  `, [userId]);

  const available: CouponItem[] = [];
  for (const row of couponsResult.rows || []) {
    available.push({
      id: row.user_coupon_id,
      coupon_id: row.coupon_id,
      code: row.code,
      name: row.name,
      type: row.type,
      discount_type: row.type,
      value: row.value,
      is_stackable: row.is_stackable,
      permanent_days: row.permanent_days || 0,
      description: row.description,
      expires_at: row.expires_at
    });
  }

  return { available };
}

async function getUsedCoupons(userId: string) {
  const result = await query(`
    SELECT
      uc.id as user_coupon_id,
      c.id as coupon_id,
      c.code,
      c.name,
      c.type,
      c.value,
      c.is_stackable,
      c.permanent_days,
      c.description,
      uc.expires_at
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
      AND uc.status = 'used'
    ORDER BY uc.received_at DESC
  `, [userId]);

  return (result.rows || []).map((row: any) => ({
    id: row.user_coupon_id,
    coupon_id: row.coupon_id,
    code: row.code,
    name: row.name,
    type: row.type,
    discount_type: row.type,
    value: row.value,
    is_stackable: row.is_stackable,
    permanent_days: row.permanent_days || 0,
    description: row.description,
    expires_at: row.expires_at
  }));
}

async function getExpiredCoupons(userId: string) {
  const result = await query(`
    SELECT
      uc.id as user_coupon_id,
      c.id as coupon_id,
      c.code,
      c.name,
      c.type,
      c.value,
      c.is_stackable,
      c.permanent_days,
      c.description,
      uc.expires_at
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
      AND uc.status = 'active'
      AND datetime('now') >= uc.expires_at
      AND (c.is_permanent = 0 OR c.is_permanent IS NULL)
    ORDER BY uc.expires_at DESC
  `, [userId]);

  return (result.rows || []).map((row: any) => ({
    id: row.user_coupon_id,
    coupon_id: row.coupon_id,
    code: row.code,
    name: row.name,
    type: row.type,
    discount_type: row.type,
    value: row.value,
    is_stackable: row.is_stackable,
    permanent_days: row.permanent_days || 0,
    description: row.description,
    expires_at: row.expires_at
  }));
}

async function getClaimableCoupons(userId: string) {
  const result = await query(`
    SELECT
      c.id as coupon_id,
      c.code,
      c.name,
      c.type,
      c.value,
      c.is_stackable,
      c.permanent_days,
      c.description,
      c.end_date
    FROM coupons c
    WHERE c.is_active = 1
      AND c.start_date <= datetime('now')
      AND c.end_date >= datetime('now')
      AND c.id NOT IN (SELECT coupon_id FROM user_coupons WHERE user_id = ?)
    ORDER BY c.created_at DESC
  `, [userId]);

  return (result.rows || []).map((row: any) => ({
    id: 0,
    coupon_id: row.coupon_id,
    code: row.code,
    name: row.name,
    type: row.type,
    discount_type: row.type,
    value: row.value,
    is_stackable: row.is_stackable,
    permanent_days: row.permanent_days || 0,
    description: row.description,
    expires_at: row.end_date
  }));
}

export async function GET(request: NextRequest) {
  logMonitor('CART', 'REQUEST', { method: 'GET', path: '/api/cart/coupons' });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) return authResult.response;

    const userId = String(authResult.user.userId);
    const coupons = await getUserCoupons(userId);
    const usedCoupons = await getUsedCoupons(userId);
    const expiredCoupons = await getExpiredCoupons(userId);
    const claimableCoupons = await getClaimableCoupons(userId);

    return NextResponse.json({
      success: true,
      data: {
        coupons: {
          ...coupons,
          unavailable: [],
          used: usedCoupons,
          expired: expiredCoupons,
          claimable: claimableCoupons
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cart coupons:', error);
    logMonitor('CART', 'ERROR', { action: 'GET_CART_COUPONS', error: String(error) });
    return NextResponse.json({ success: false, error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

