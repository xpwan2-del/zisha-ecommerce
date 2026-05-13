import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { OrderEvent, OrderStatusService } from '@/lib/order-status-service';

/**
 * ============================================================
 * 订单退款申请 API
 * ============================================================
 *
 * @api {POST} /api/orders/[id]/refund 申请退款
 * @apiName RequestRefund
 * @apiGroup ORDERS
 * @apiDescription 用户对已支付或已发货的订单申请退款
 *
 * @apiHeader {String} Authorization Bearer Token
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 退款申请信息
 * @apiSuccessExample {json} Success-Response:
 *     {"success":true,"data":{"order_id":"1","order_number":"ORD...","status":"refunding"}}
 *
 * @apiError {String} UNAUTHORIZED 未登录
 * @apiError {String} ORDER_NOT_FOUND 订单不存在
 * @apiError {String} INVALID_STATUS 订单状态不允许退款
 */

// ============================================================
// 辅助函数
// ============================================================

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

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

// ============================================================
// POST - 申请退款
// ============================================================

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/orders/[id]/refund'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('ORDERS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const userId = authResult.user.userId;
    const urlParts = new URL(request.url).pathname.split('/');
    const orderId = urlParts[urlParts.indexOf('orders') + 1];

    if (!orderId) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Missing order ID' });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    const orderResult = await query(
      `SELECT id, order_number, order_status, user_id
       FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('ORDERS', 'NOT_FOUND', { reason: 'Order not found', orderId });
      return createErrorResponse('ORDER_NOT_FOUND', lang, 404);
    }

    const order = orderResult.rows[0];

    if (order.user_id !== userId) {
      logMonitor('ORDERS', 'FORBIDDEN', { reason: 'Order does not belong to user', orderId, userId });
      return createErrorResponse('FORBIDDEN', lang, 403);
    }

    if (!['paid', 'shipped'].includes(order.order_status)) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: 'Order status does not allow refund',
        orderId,
        orderStatus: order.order_status
      });
      return createErrorResponse('INVALID_STATUS', lang, 400);
    }

    const statusChange = await OrderStatusService.changeStatus(
      Number(orderId),
      OrderEvent.REFUND_REQUEST,
      {
        type: 'user',
        id: userId,
        name: authResult.user?.name || 'User',
      },
      {
        reason: '用户申请退款',
        refundFromStatus: order.order_status,
      }
    );

    if (!statusChange.success) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', {
        reason: statusChange.error,
        orderId,
        orderStatus: order.order_status
      });
      return createErrorResponse('INVALID_STATUS', lang, 400);
    }

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'REQUEST_REFUND',
      orderId: String(orderId),
      orderNumber: order.order_number,
      previousStatus: order.order_status
    });

    return createSuccessResponse({
      order_id: String(orderId),
      order_number: order.order_number,
      status: 'refunding_payment'
    });

  } catch (error) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'REQUEST_REFUND',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
