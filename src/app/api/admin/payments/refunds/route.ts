import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { OrderEvent, OrderStatusService } from '@/lib/order-status-service';

const REFUND_STATUSES = ['refunding_payment', 'refunding', 'refunded'] as const;

export async function GET(request: NextRequest) {
  logApiRequest('PAYMENTS', 'GET', '/api/admin/payments/refunds');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'refunding_payment';
    const statusFilter = status === 'all' ? [...REFUND_STATUSES] : REFUND_STATUSES.includes(status as any) ? [status] : ['refunding_payment'];

    const placeholders = statusFilter.map(() => '?').join(', ');
    const result = await query(
      `SELECT id, order_number, payment_method, order_status, payment_status, final_amount, created_at, updated_at
       FROM orders
       WHERE order_status IN (${placeholders})
          OR payment_status IN (${placeholders})
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 100`,
      [...statusFilter, ...statusFilter]
    );

    logApiSuccess('PAYMENTS', 'GET_REFUND_ORDERS', { total: result.rows.length });
    return createSuccessResponse({ refunds: result.rows });
  } catch (error) {
    logApiError('PAYMENTS', 'GET_REFUND_ORDERS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('PAYMENTS', 'POST', '/api/admin/payments/refunds');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { order_number, action, reason } = body || {};
    if (!order_number || !action) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    if (!['approve', 'reject'].includes(action)) {
      return createErrorResponse('INVALID_REFUND_ACTION', 400);
    }

    const orderResult = await query(
      `SELECT id, order_number, payment_method, order_status, payment_status, refund_from_status
       FROM orders
       WHERE order_number = ?`,
      [order_number]
    );

    if (orderResult.rows.length === 0) {
      return createErrorResponse('ORDER_NOT_FOUND', 404);
    }

    const order = orderResult.rows[0];
    if (order.order_status !== 'refunding_payment') {
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    const operatorId = auth.user.userId || auth.user.id || 0;
    const operatorName = auth.user.name || 'Admin';
    const eventCode = action === 'approve' ? OrderEvent.REFUND_APPROVE : OrderEvent.REFUND_REJECT;
    const statusChange = await OrderStatusService.changeStatus(
      Number(order.id),
      eventCode,
      {
        type: 'admin',
        id: operatorId,
        name: operatorName,
      },
      {
        reason: reason || (action === 'approve' ? '管理员同意退款' : '管理员拒绝退款'),
      }
    );

    if (!statusChange.success) {
      return createErrorResponse(statusChange.error || 'INVALID_ORDER_STATUS', 400);
    }

    await recordAdminAuditLog({
      request,
      module: 'PAYMENTS',
      action: action === 'approve' ? 'APPROVE_REFUND' : 'REJECT_REFUND',
      description: action === 'approve' ? `管理员同意退款审批: ${order_number}` : `管理员拒绝退款申请: ${order_number}`,
      operator: operatorName,
      status: 'success',
      resourceId: order.id,
      resourceType: 'order',
      riskLevel: 'critical',
      metadata: {
        order_number,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        refund_from_status: order.refund_from_status,
        fromStatus: statusChange.fromStatus,
        toStatus: statusChange.toStatus,
        reason: reason || null,
      },
    });

    logApiSuccess('PAYMENTS', 'POST_REFUND_ORDER_ACTION', { order_number, action, fromStatus: statusChange.fromStatus, toStatus: statusChange.toStatus });
    return createSuccessResponse({
      message: action === 'approve' ? '退款审批已通过，等待支付通道退款结果' : '退款申请已拒绝',
      order: {
        id: order.id,
        order_number: order.order_number,
        order_status: statusChange.toStatus,
        payment_status: action === 'approve' ? 'refunding' : 'paid',
      },
    });
  } catch (error) {
    logApiError('PAYMENTS', 'POST_REFUND_ORDER_ACTION', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
