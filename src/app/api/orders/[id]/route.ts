import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { createInventoryTransaction, InventoryTransactionCode } from '@/lib/inventory-transactions';
import { logMonitor } from '@/lib/utils/logger';
import { OrderStatusService, OrderEvent, OperatorType } from '@/lib/order-status-service';

/**
 * @api {GET} /api/orders/:id 获取订单详情
 * @apiName GetOrderDetail
 * @apiGroup ORDERS
 * @apiDescription 根据订单 ID 获取订单完整详情，包括商品明细、支付信息、物流信息。
 */

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

    const paymentLogsResult = await query(
      `SELECT id, transaction_id, amount, status, error_code, error_message,
              is_success, created_at
       FROM payment_logs
       WHERE order_id = ?
       ORDER BY created_at DESC`,
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
        logistics: logisticsResult.rows || [],
        payment_logs: paymentLogsResult.rows || []
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

/**
 * @api {PATCH} /api/orders/:id 取消订单
 * @apiName CancelOrder
 * @apiGroup ORDERS
 * @apiDescription 用户取消待支付订单，自动归还库存。
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'PATCH', action: 'CANCEL_ORDER' });

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const orderId = id;
    const body = await request.json();
    const { action } = body;

    if (action !== 'cancel') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const orderResult = await query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    if (authResult.user?.role !== 'admin' && order.user_id !== authResult.user?.userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (order.order_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending orders can be cancelled' },
        { status: 400 }
      );
    }

    const itemsResult = await query(
      `SELECT oi.product_id, oi.quantity, p.name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    for (const item of itemsResult.rows) {
      const beforeResult = await query(
        'SELECT quantity FROM inventory WHERE product_id = ?',
        [item.product_id]
      );
      const beforeStock = beforeResult.rows[0]?.quantity || 0;

      await query(
        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );

      await createInventoryTransaction({
        productId: item.product_id,
        productName: item.name,
        transactionTypeCode: InventoryTransactionCode.SALES_CANCEL,
        quantityChange: item.quantity,
        quantityBefore: beforeStock,
        quantityAfter: beforeStock + item.quantity,
        reason: '用户取消订单',
        referenceType: 'order_cancel',
        referenceId: orderId,
        operatorId: authResult.user?.userId,
        operatorName: authResult.user?.name,
      });
    }

    const orderCouponsResult = await query(
      `SELECT oc.id as order_coupon_id, oc.coupon_id as user_coupon_id, oc.discount_applied
       FROM order_coupons oc
       JOIN user_coupons uc ON oc.coupon_id = uc.id 
         AND oc.user_id = uc.user_id AND uc.status = 'used'
       WHERE oc.order_id = ? AND oc.status = 'applied'`,
      [orderId]
    );

    for (const row of orderCouponsResult.rows) {
      await query(
        `UPDATE user_coupons SET status = 'active', used_order_id = NULL 
         WHERE id = ? AND user_id = ?`,
        [row.user_coupon_id, order.user_id]
      );
      await query(
        `UPDATE order_coupons SET status = 'refunded', refunded_at = datetime('now') 
         WHERE id = ?`,
        [row.order_coupon_id]
      );
    }

    // 通过 OrderStatusService 进行状态变更（校验状态转换是否合法）
    // 只有 pending 状态才允许 user_cancel 事件
    const statusResult = await OrderStatusService.changeStatus(
      Number(orderId),
      OrderEvent.USER_CANCEL,
      { type: OperatorType.USER, id: authResult.user?.userId || 0, name: authResult.user?.name || 'User' },
      { reason: 'user_cancelled', itemsReturned: itemsResult.rows.length }
    );

    if (!statusResult.success) {
      logMonitor('ORDERS', 'ERROR', { 
        action: 'CANCEL_ORDER_FAILED', 
        orderId,
        orderNumber: order.order_number,
        error: statusResult.error 
      });
      return NextResponse.json(
        { success: false, error: statusResult.error || 'CANCEL_FAILED' },
        { status: 400 }
      );
    }

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'CANCEL_ORDER',
      orderId,
      orderNumber: order.order_number,
      itemsReturned: itemsResult.rows.length
    });

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: order.order_number,
        status: 'cancelled',
        items_returned: itemsResult.rows.length
      }
    });
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'CANCEL_ORDER', error: error?.message || String(error) });
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
