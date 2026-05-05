import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { releaseOrderResources } from '@/lib/order-release-service';
import { OrderStatusService, OrderEvent, OperatorType } from '@/lib/order-status-service';
import { getMessage } from '@/lib/messages';
import { logMonitor } from '@/lib/utils/logger';

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error, message: getMessage(error as any, lang) },
    { status }
  );
}

/**
 * @api {GET} /api/orders/:id 获取订单详情
 * @apiName GetOrderDetail
 * @apiGroup ORDERS
 * @apiDescription 根据订单 ID 获取订单完整详情，包括商品明细、支付信息、物流信息。
 */

// GET /api/orders/[id] - Get order details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const lang = getLangFromRequest(request);
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'GET', action: 'GET_ORDER_DETAIL' });
    
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const orderId = id;

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
      return createErrorResponse('NOT_FOUND', lang, 404);
    }

    const order = orderResult.rows[0];

    if (order.order_status === 'pending' && order.created_at) {
      const expiredResult = await query(
        `SELECT id FROM orders WHERE id = ? AND order_status = 'pending' AND datetime(created_at, '+30 minutes') < datetime('now')`,
        [orderId]
      );
      if (expiredResult.rows.length > 0) {
        try {
          await releaseOrderResources({
            orderId: Number(orderId),
            userId: order.user_id,
            transactionTypeCode: 'order_cancel',
            inventoryReason: '订单超时自动取消，归还库存',
            referenceType: 'order_timeout',
            operatorId: null,
            operatorName: 'SYSTEM'
          });
          const statusResult = await OrderStatusService.changeStatus(
            Number(orderId),
            OrderEvent.TIMEOUT_CANCEL,
            { type: OperatorType.SYSTEM, id: 0, name: 'SYSTEM' },
            { reason: 'order_timeout', expiredAfterMinutes: 30 }
          );
          if (!statusResult.success) {
            await query(`UPDATE orders SET order_status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, [orderId]);
          }
          await query(`UPDATE orders SET payment_status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, [orderId]);
          await query(
            `INSERT INTO payment_logs (order_id, order_number, payment_method, status, error_code, error_message, is_success, payment_stage, amount, currency, extra_data, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [Number(orderId), order.order_number, order.payment_method || 'unknown', 'cancelled', 'TIMEOUT', 'Order expired (lazy cleanup on GET)', 0, 'timeout', order.final_amount || 0, 'USD', JSON.stringify({ reason: 'timeout', source: 'order_get_lazy_cleanup' })]
          );
          order.order_status = 'cancelled';
          order.payment_status = 'cancelled';
        } catch (e) {
          console.error('[Orders GET] Lazy cleanup error:', e);
        }
      }
    }

    if (authResult.user?.role !== 'admin' && order.user_id !== authResult.user?.userId) {
      return createErrorResponse('FORBIDDEN', lang, 403);
    }

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

    const items = (itemsResult.rows || []).map(item => ({
      ...item,
      subtotal: (item.original_price || 0) * (item.quantity || 0)
    }));

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

    const orderCouponsResult = await query(
      `SELECT
        oc.id as order_coupon_id,
        oc.coupon_id,
        oc.discount_applied,
        oc.status,
        oc.applied_at,
        c.code as coupon_code,
        c.name as coupon_name,
        c.type as coupon_type,
        c.value as coupon_value
       FROM order_coupons oc
       LEFT JOIN coupons c ON oc.coupon_id = c.id
       WHERE oc.order_id = ? AND oc.user_id = ? AND oc.status = 'applied'`,
      [orderId, order.user_id]
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
        items,
        coupons: orderCouponsResult.rows || [],
        selected_coupon_ids: (orderCouponsResult.rows || []).map((coupon: any) => Number(coupon.coupon_id)),
        logistics: logisticsResult.rows || [],
        payment_logs: paymentLogsResult.rows || []
      }
    });
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'GET_ORDER_DETAIL', error: error?.message || String(error) });
    console.error('Error fetching order details:', error);
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

/**
 * @api {PATCH} /api/orders/:id 取消订单
 * @apiName CancelOrder
 * @apiGroup ORDERS
 * @apiDescription 用户取消待支付订单，自动归还库存。
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const lang = getLangFromRequest(request);
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
      return createErrorResponse('INVALID_ACTION', lang, 400);
    }

    const orderResult = await query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', lang, 404);
    }

    const order = orderResult.rows[0];

    if (authResult.user?.role !== 'admin' && order.user_id !== authResult.user?.userId) {
      return createErrorResponse('FORBIDDEN', lang, 403);
    }

    if (order.order_status !== 'pending') {
      return createErrorResponse('INVALID_ORDER_STATUS', lang, 400);
    }

    const releaseResult = await releaseOrderResources({
      orderId,
      userId: order.user_id,
      transactionTypeCode: 'sales_cancel',
      inventoryReason: '用户取消订单',
      referenceType: 'order_cancel',
      operatorId: authResult.user?.userId || null,
      operatorName: authResult.user?.name || 'User'
    });

    const statusResult = await OrderStatusService.changeStatus(
      Number(orderId),
      OrderEvent.USER_CANCEL,
      {
        type: OperatorType.USER,
        id: authResult.user?.userId || 0,
        name: authResult.user?.name || 'User'
      },
      {
        reason: 'user_cancel',
        releasedCouponCount: releaseResult.couponsReleased,
        restoredItemCount: releaseResult.itemsReleased
      }
    );

    if (!statusResult.success) {
      logMonitor('ORDERS', 'ERROR', {
        action: 'CANCEL_ORDER_STATUS_TRANSITION_FAILED',
        orderId,
        error: statusResult.error || 'UNKNOWN_STATUS_ERROR'
      });

      await query(
        `UPDATE orders SET
          order_status = 'cancelled',
          updated_at = datetime('now')
         WHERE id = ?`,
        [orderId]
      );
    }

    await query(
      `UPDATE orders SET
        payment_status = 'cancelled',
        updated_at = datetime('now')
       WHERE id = ?`,
      [orderId]
    );

    await query(
      `INSERT INTO payment_logs (
        order_id, order_number, payment_method, status,
        error_code, error_message, is_success,
        payment_stage, amount, currency, extra_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        orderId,
        order.order_number,
        order.payment_method || 'unknown',
        'cancelled',
        'USER_CANCEL',
        'User manually cancelled the order, inventory released and coupons restored',
        0,
        'user_cancel',
        order.final_amount || 0,
        'USD',
        JSON.stringify({
          reason: 'user_cancel',
          cancelled_at: new Date().toISOString(),
          released_coupon_count: releaseResult.couponsReleased,
          restored_item_count: releaseResult.itemsReleased
        })
      ]
    );

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'CANCEL_ORDER',
      orderId,
      orderNumber: order.order_number,
      itemsReturned: releaseResult.itemsReleased,
      couponsReturned: releaseResult.couponsReleased
    });

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: order.order_number,
        status: 'cancelled',
        items_returned: releaseResult.itemsReleased,
        coupons_returned: releaseResult.couponsReleased
      }
    });
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'CANCEL_ORDER', error: error?.message || String(error) });
    console.error('Error cancelling order:', error);
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
