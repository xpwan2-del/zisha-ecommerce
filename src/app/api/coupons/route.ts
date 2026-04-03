import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }
    
    const result = await query(
      'SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())',
      [code]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired coupon' }, { status: 404 });
    }
    
    const coupon = result.rows[0];
    
    return NextResponse.json({ 
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      minimum_spend: coupon.minimum_spend,
      max_discount: coupon.max_discount,
      is_active: coupon.is_active,
      expires_at: coupon.expires_at
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, discount_type, discount_value, minimum_spend, max_discount, expires_at } = body;
    
    const result = await query(
      `INSERT INTO coupons (code, discount_type, discount_value, minimum_spend, max_discount, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, code, discount_type, discount_value, minimum_spend, max_discount, is_active, expires_at`,
      [code, discount_type, discount_value, minimum_spend, max_discount, true, expires_at]
    );
    
    return NextResponse.json({ coupon: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}