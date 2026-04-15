import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { coupon_code, order_amount } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (!coupon_code) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    if (!order_amount || order_amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid order amount is required' },
        { status: 400 }
      );
    }

    const couponResult = await query(`
      SELECT * FROM coupons 
      WHERE code = ? AND is_active = 1
    `, [coupon_code]);

    if (couponResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 400 }
      );
    }

    const coupon = couponResult.rows[0];

    if (couponResult.rows[0].start_date && new Date() < new Date(couponResult.rows[0].start_date)) {
      return NextResponse.json(
        { success: false, error: 'Coupon is not yet available' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(coupon.end_date)) {
      return NextResponse.json(
        { success: false, error: 'Coupon has expired' },
        { status: 400 }
      );
    }

    const userCouponResult = await query(`
      SELECT * FROM user_coupons 
      WHERE user_id = ? AND coupon_id = ? AND status = 'active'
    `, [userId, coupon.id]);

    if (userCouponResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You do not have this coupon' },
        { status: 400 }
      );
    }

    const userCoupon = userCouponResult.rows[0];

    if (userCoupon.expires_at && new Date() > new Date(userCoupon.expires_at)) {
      return NextResponse.json(
        { success: false, error: 'Your coupon has expired' },
        { status: 400 }
      );
    }

    if (coupon.min_spend && order_amount < parseFloat(coupon.min_spend)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Minimum spend of ${coupon.min_spend} is required`,
          min_spend: coupon.min_spend
        },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.type === 'no_threshold') {
      discount = parseFloat(coupon.value);
    } else if (coupon.type === 'min_spend') {
      if (order_amount >= parseFloat(coupon.min_spend)) {
        discount = parseFloat(coupon.value);
      }
    }

    if (coupon.max_discount && discount > parseFloat(coupon.max_discount)) {
      discount = parseFloat(coupon.max_discount);
    }

    if (discount > order_amount) {
      discount = order_amount;
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        coupon_id: coupon.id,
        user_coupon_id: userCoupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        discount: discount,
        original_amount: order_amount,
        final_amount: order_amount - discount
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}
