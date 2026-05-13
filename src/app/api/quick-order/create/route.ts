import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { commitOrderPricing } from '@/lib/order-pricing-service';

/**
 * ============================================================
 * 快速订单提交
 * ============================================================
 *
 * @api {POST} /api/quick-order/create 提交快速订单
 * @apiName CreateQuickOrder
 * @apiGroup Orders
 * @apiDescription 提交快速订单并持久化最终金额真相。
 */

function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

function createErrorResponse(error: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: NextRequest) {
  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/quick-order/create'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('ORDERS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const body = await request.json();
    const { order_id, address_id, payment_method, coupon_ids } = body;
    const userId = authResult.user.userId;

    if (!order_id || !address_id || !payment_method) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        order_id,
        address_id,
        payment_method
      });
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const orderResult = await query(
      `SELECT id, order_number, order_status
       FROM orders
       WHERE id = ? AND user_id = ?`,
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('ORDERS', 'NOT_FOUND', { orderId: order_id, userId });
      return createErrorResponse('ORDER_NOT_FOUND', 404);
    }

    const order = orderResult.rows[0];

    if (order.order_status !== 'pending') {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Order status invalid',
        orderId: order_id,
        orderStatus: order.order_status
      });
      return createErrorResponse('ORDER_STATUS_INVALID', 400);
    }

    const pricing = await commitOrderPricing({
      orderId: Number(order_id),
      userId,
      addressId: Number(address_id),
      couponIds: coupon_ids || [],
      paymentMethod: payment_method,
    });

    const refreshedOrderResult = await query(
      `SELECT order_number FROM orders WHERE id = ? AND user_id = ?`,
      [order_id, userId]
    );

    const refreshedOrder = refreshedOrderResult.rows[0];

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'CREATE_QUICK_ORDER',
      orderId: order_id,
      orderNumber: refreshedOrder.order_number,
      userId,
      paymentMethod: payment_method,
      finalAmount: pricing.final_amount,
      totalDiscount: pricing.order_final_discount_amount
    });

    return createSuccessResponse({
      order_id: Number(order_id),
      order_number: refreshedOrder.order_number,
      payment_method,
      total_original_price: pricing.total_original_price,
      total_promotions_discount_amount: pricing.total_promotions_discount_amount,
      total_after_promotions_amount: pricing.total_after_promotions_amount,
      total_coupon_discount: pricing.total_coupon_discount,
      order_final_discount_amount: pricing.order_final_discount_amount,
      shipping_fee: pricing.shipping_fee,
      final_amount: pricing.final_amount,
      amount_aed: pricing.total_aed,
      amount_usd: pricing.total_usd,
      amount_cny: pricing.total_cny
    });
  } catch (error) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'CREATE_QUICK_ORDER',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
