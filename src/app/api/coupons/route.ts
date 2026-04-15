import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const result = await query(`
      SELECT 
        uc.id as user_coupon_id,
        c.id as coupon_id,
        c.code,
        c.name,
        c.type,
        c.discount_type,
        c.value,
        c.min_spend,
        c.max_discount,
        c.start_date,
        c.end_date,
        c.description,
        uc.status as user_coupon_status,
        uc.received_at,
        uc.expires_at
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ?
        AND uc.status = 'active'
        AND datetime('now') < uc.expires_at
        AND datetime('now') > c.start_date
        AND datetime('now') < c.end_date
        AND c.is_active = 1
      ORDER BY uc.received_at DESC
    `, [userId]);

    return NextResponse.json({
      success: true,
      data: {
        coupons: result.rows || []
      }
    });
  } catch (error) {
    console.error('Error fetching user coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { coupon_id } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (!coupon_id) {
      return NextResponse.json(
        { success: false, error: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    const couponResult = await query(`
      SELECT * FROM coupons 
      WHERE id = ? AND is_active = 1
        AND datetime('now') > start_date 
        AND datetime('now') < end_date
    `, [coupon_id]);

    if (couponResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Coupon not available or expired' },
        { status: 400 }
      );
    }

    const coupon = couponResult.rows[0];

    const userCouponResult = await query(`
      SELECT * FROM user_coupons 
      WHERE user_id = ? AND coupon_id = ?
    `, [userId, coupon_id]);

    if (userCouponResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have this coupon' },
        { status: 400 }
      );
    }

    const userCountResult = await query(`
      SELECT COUNT(*) as count FROM user_coupons 
      WHERE user_id = ? AND coupon_id = ?
    `, [userId, coupon_id]);

    if (userCountResult.rows[0].count >= coupon.user_limit) {
      return NextResponse.json(
        { success: false, error: 'You have reached the limit for this coupon' },
        { status: 400 }
      );
    }

    const globalCountResult = await query(`
      SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = ?
    `, [coupon_id]);

    if (coupon.usage_limit && globalCountResult.rows[0].count >= coupon.usage_limit) {
      return NextResponse.json(
        { success: false, error: 'Coupon has been fully claimed' },
        { status: 400 }
      );
    }

    await query(`
      INSERT INTO user_coupons (user_id, coupon_id, status, expires_at)
      VALUES (?, ?, 'active', ?)
    `, [userId, coupon_id, coupon.end_date]);

    return NextResponse.json({
      success: true,
      message: 'Coupon received successfully',
      data: {
        coupon_id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        min_spend: coupon.min_spend,
        expires_at: coupon.end_date
      }
    });
  } catch (error) {
    console.error('Error receiving coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to receive coupon' },
      { status: 500 }
    );
  }
}
