import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { OrderEvent, OrderStatusService } from '@/lib/order-status-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const orderId = parseInt(id);
    logApiRequest('ORDERS', 'POST', `/api/admin/orders/${orderId}/refund/reject`);

    const { reason } = await request.json();
    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    const order = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (order.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);
    const cur = order.rows[0];

    if (cur.order_status !== 'refunding_payment') return createErrorResponse('INVALID_ORDER_STATUS', 400);

    const statusChange = await OrderStatusService.changeStatus(
      orderId,
      OrderEvent.REFUND_REJECT,
      {
        type: 'admin',
        id: operatorId,
        name: operatorName,
      },
      {
        reason: reason || '管理员拒绝退款',
      }
    );

    if (!statusChange.success) {
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    await recordAdminAuditLog({
      request,
      module: 'ORDERS',
      action: 'REJECT_REFUND',
      description: '管理员拒绝退款申请',
      operator: operatorName,
      status: 'success',
      resourceId: orderId,
      resourceType: 'order',
      riskLevel: 'critical',
      metadata: {
        orderNumber: cur.order_number,
        reason: reason || '管理员拒绝退款',
        fromStatus: statusChange.fromStatus,
        toStatus: statusChange.toStatus,
      },
    });

    logApiSuccess('ORDERS', 'REJECT_REFUND', {
      orderId,
      reason,
      fromStatus: statusChange.fromStatus,
      toStatus: statusChange.toStatus,
    });
    return createSuccessResponse({
      message: '退款申请已拒绝',
      order_status: statusChange.toStatus,
      payment_status: 'paid',
    });
  } catch (error) {
    logApiError('ORDERS', 'REJECT_REFUND', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
