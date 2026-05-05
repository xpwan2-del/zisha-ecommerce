import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { OrderStatusService, OrderEvent, OperatorType } from '@/lib/order-status-service';
import { releaseOrderResources } from '@/lib/order-release-service';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/orders-list 获取用户订单列表
 * @apiName GetUserOrders
 * @apiGroup ORDERS
 * @apiDescription 获取当前登录用户的订单列表，支持分页和状态筛选。
 */


export async function GET(request: NextRequest) {
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'GET', action: 'GET_ORDERS_LIST' });
    
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const user_id = authResult.user.userId;

    try {
      const expiredOrders = await query(
        `SELECT o.id, o.user_id, o.order_number, o.payment_method, o.final_amount
         FROM orders o
         WHERE o.order_status = 'pending'
           AND o.user_id = ?
           AND o.created_at IS NOT NULL
           AND datetime(o.created_at, '+30 minutes') < datetime('now')`,
        [user_id]
      );
      for (const eo of expiredOrders.rows) {
        try {
          await releaseOrderResources({
            orderId: eo.id,
            userId: eo.user_id,
            transactionTypeCode: 'order_cancel',
            inventoryReason: '订单超时自动取消，归还库存',
            referenceType: 'order_timeout',
            operatorId: null,
            operatorName: 'SYSTEM'
          });
          const statusResult = await OrderStatusService.changeStatus(
            eo.id,
            OrderEvent.TIMEOUT_CANCEL,
            { type: OperatorType.SYSTEM, id: 0, name: 'SYSTEM' },
            { reason: 'order_timeout', expiredAfterMinutes: 30 }
          );
          if (!statusResult.success) {
            await query(`UPDATE orders SET order_status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, [eo.id]);
          }
          await query(`UPDATE orders SET payment_status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, [eo.id]);
          await query(
            `INSERT INTO payment_logs (order_id, order_number, payment_method, status, error_code, error_message, is_success, payment_stage, amount, currency, extra_data, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [eo.id, eo.order_number, eo.payment_method || 'unknown', 'cancelled', 'TIMEOUT', 'Order expired (lazy cleanup on list)', 0, 'timeout', eo.final_amount || 0, 'USD', JSON.stringify({ reason: 'timeout', source: 'orders_list_lazy_cleanup' })]
          );
        } catch (e) {
          console.error('[Orders List] Lazy cleanup error for order', eo.id, e);
        }
      }
    } catch (e) {
      console.error('[Orders List] Cleanup scan error:', e);
    }

    const { searchParams } = new URL(request.url);
    const order_status = searchParams.get('order_status');
    const order_number = searchParams.get('order_number');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

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

    if (order_number) {
      ordersSql += ' AND o.order_number = ?';
      params.push(order_number);
    }

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

    if (order_number) {
      countSql += ' AND order_number = ?';
      countParams.push(order_number);
    }

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