import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const order_status = searchParams.get('order_status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const user_id = parseInt(searchParams.get('user_id') || '0');

    if (!user_id || user_id <= 0) {
      return NextResponse.json({
        success: false,
        error: 'USER_ID_REQUIRED'
      }, { status: 400 });
    }

    let ordersSql = `
      SELECT 
        o.id,
        o.order_number,
        o.order_status,
        o.payment_status,
        o.total_amount,
        o.order_final_discount_amount,
        o.total_coupon_discount,
        o.final_amount,
        o.shipping_fee,
        a.contact_name,
        a.phone,
        a.state_name,
        a.city,
        a.street_address,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN addresses a ON o.shipping_address_id = a.id
      WHERE o.user_id = ?
    `;

    const params: any[] = [user_id];

    if (order_status) {
      if (order_status === 'refund') {
        ordersSql += ' AND o.order_status IN (?, ?)';
        params.push('refunding', 'refunded');
      } else {
        ordersSql += ' AND o.order_status = ?';
        params.push(order_status);
      }
    }

    ordersSql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const ordersResult = await query(ordersSql, params);

    if (ordersResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          orders: [],
          pagination: { page, limit, total: 0, total_pages: 0 }
        }
      });
    }

    const orderIds = ordersResult.rows.map((o: any) => o.id);

    const itemsResult = await query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price,
              p.name, p.name_en, p.name_ar, p.image
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );

    const itemsByOrder = new Map();
    for (const item of itemsResult.rows) {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      itemsByOrder.get(item.order_id).push({
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        name_en: item.name_en,
        image: item.image,
        price: item.price,
        quantity: item.quantity
      });
    }

    const orders = ordersResult.rows.map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      order_status: o.order_status,
      payment_status: o.payment_status,
      subtotal: o.total_amount,
      discount_amount: o.order_final_discount_amount || 0,
      shipping_fee: o.shipping_fee || 0,
      final_amount: o.final_amount,
      currency: 'AED',
      created_at: o.created_at,
      address: {
        contact_name: o.contact_name || '',
        phone: o.phone || '',
        full_address: [o.state_name, o.city, o.street_address].filter(Boolean).join(' ') || ''
      },
      items: itemsByOrder.get(o.id) || []
    }));

    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const countParams: any[] = [user_id];

    if (order_status) {
      if (order_status === 'refund') {
        countSql += ' AND order_status IN (?, ?)';
        countParams.push('refunding', 'refunded');
      } else {
        countSql += ' AND order_status = ?';
        countParams.push(order_status);
      }
    }

    const countResult = await query(countSql, countParams);
    const total = countResult.rows[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('[Orders] GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'FETCH_ORDERS_FAILED',
      message: String(error)
    }, { status: 500 });
  }
}