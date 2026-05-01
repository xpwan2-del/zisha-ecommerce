import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

// GET /api/orders/[id] - Get order details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'GET', action: 'GET_ORDER_DETAIL' });
    
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const orderId = id;

    // Get order basic info
    const orderResult = await query(
      `SELECT
        o.*,
        u.name as user_name,
        u.email as user_email,
        a.contact_name as address_name,
        a.phone as address_phone,
        a.street_address as address_detail
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.shipping_address_id = a.id
      WHERE o.id = ?`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // 验证权限：普通用户只能查看自己的订单
    if (authResult.user?.role !== 'admin' && order.user_id !== authResult.user?.userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Get order items
    const itemsResult = await query(
      `SELECT
        oi.*,
        p.name as product_name,
        p.name_en as product_name_en,
        p.name_ar as product_name_ar,
        p.image as product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?`,
      [orderId]
    );

    // Get order logistics
    const logisticsResult = await query(
      'SELECT * FROM order_logistics WHERE order_id = ?',
      [orderId]
    );

    logMonitor('ORDERS', 'SUCCESS', { 
      action: 'GET_ORDER_DETAIL', 
      orderId,
      itemCount: itemsResult.rows?.length || 0 
    });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items: itemsResult.rows || [],
        logistics: logisticsResult.rows || []
      }
    });
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'GET_ORDER_DETAIL', error: error?.message || String(error) });
    console.error('Error fetching order details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}
