import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'GET', action: 'GET_ORDERS_LIST' });
    
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const order_status = searchParams.get('order_status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const user_id = authResult.user.userId;

    let ordersSql = `
      SELECT 
        o.id,
        o.order_number,
        o.order_status,
        o.payment_status,
        o.total_after_promotions_amount,
        o.total_original_price,
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

    ordersSql += ' ORDER BY COALESCE(o.updated_at, o.created_at) DESC LIMIT ? OFFSET ?';
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
      `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.original_price,
              oi.promotion_ids, oi.total_promotions_discount_amount,
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
        original_price: item.original_price,
        promotion_ids: item.promotion_ids ? JSON.parse(item.promotion_ids) : [],
        total_promotions_discount_amount: item.total_promotions_discount_amount || 0,
        quantity: item.quantity
      });
    }

    const orders = ordersResult.rows.map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      order_status: o.order_status,
      payment_status: o.payment_status,
      total_after_promotions_amount: o.total_after_promotions_amount || 0,
      total_original_price: o.total_original_price || 0,
      order_final_discount_amount: o.order_final_discount_amount || 0,
      total_coupon_discount: o.total_coupon_discount || 0,
      shipping_fee: o.shipping_fee || 0,
      final_amount: o.final_amount || 0,
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

    logMonitor('ORDERS', 'SUCCESS', { 
      action: 'GET_ORDERS_LIST', 
      orderCount: orders.length,
      total,
      page,
      limit,
      orderStatus: order_status || 'all'
    });

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
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'GET_ORDERS_LIST', error: error?.message || String(error) });
    console.error('[Orders] GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'FETCH_ORDERS_FAILED',
      message: String(error)
    }, { status: 500 });
  }
}