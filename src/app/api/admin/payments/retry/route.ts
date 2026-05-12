import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest) {
  logApiRequest('PAYMENTS', 'POST', '/api/admin/payments/retry');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { order_number } = body || {};

    if (!order_number) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const result = await query(
      `SELECT id, order_number, payment_method, payment_status, order_status, final_amount, reference_id
       FROM orders WHERE order_number = ?`,
      [order_number]
    );

    if (result.rows.length === 0) {
      return createErrorResponse('ORDER_NOT_FOUND', 404);
    }

    const order = result.rows[0];
    const retryableStatuses = ['failed', 'cancelled', 'error', 'timeout', 'unpaid'];
    const isRetryable = retryableStatuses.includes(String(order.payment_status || '').toLowerCase()) || order.order_status === 'pending';

    if (!isRetryable) {
      return createErrorResponse('PAYMENT_RETRY_NOT_AVAILABLE', 400);
    }

    await recordAdminAuditLog({
      request,
      module: 'PAYMENTS',
      action: 'PAYMENT_RETRY_REQUESTED',
      description: `管理员发起支付异常重试: ${order_number}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: order.id,
      resourceType: 'order',
      riskLevel: 'high',
      metadata: {
        order_number,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
      },
    });

    logApiSuccess('PAYMENTS', 'PAYMENT_RETRY_REQUESTED', { order_number });
    return createSuccessResponse({
      message: '支付可重新发起',
      payment_request: {
        order_number: order.order_number,
        payment_method: order.payment_method,
        reference_id: order.reference_id,
        final_amount: Number(order.final_amount || 0),
        create_payment_endpoint: `/api/payments/${order.payment_method}`,
      },
      order: {
        id: order.id,
        order_number: order.order_number,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
      },
    });
  } catch (error) {
    logApiError('PAYMENTS', 'PAYMENT_RETRY_REQUESTED', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
