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
    logApiRequest('ORDERS', 'POST', `/api/admin/orders/${orderId}/refund/approve`);

    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    const order = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (order.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);
    const cur = order.rows[0];

    if (cur.order_status !== 'refunding_payment') return createErrorResponse('INVALID_ORDER_STATUS', 400);

    const approveChange = await OrderStatusService.changeStatus(
      orderId,
      OrderEvent.REFUND_APPROVE,
      {
        type: 'admin',
        id: operatorId,
        name: operatorName,
      },
      {
        reason: '管理员同意退款',
      }
    );

    if (!approveChange.success) {
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    await recordAdminAuditLog({
      request,
      module: 'ORDERS',
      action: 'APPROVE_REFUND',
      description: '管理员同意退款审批',
      operator: operatorName,
      status: 'success',
      resourceId: orderId,
      resourceType: 'order',
      riskLevel: 'critical',
      metadata: {
        orderNumber: cur.order_number,
        fromStatus: approveChange.fromStatus,
        toStatus: approveChange.toStatus,
        paymentMethod: cur.payment_method || null,
      },
    });

    logApiSuccess('ORDERS', 'APPROVE_REFUND', {
      orderId,
      orderNumber: cur.order_number,
      approveFromStatus: approveChange.fromStatus,
      approveToStatus: approveChange.toStatus,
      paymentMethod: cur.payment_method || null,
    });
    return createSuccessResponse({
      message: '退款审批已通过，等待支付通道退款结果',
      order_status: approveChange.toStatus,
      payment_status: 'refunding',
      after_sale_status: 'approved',
    });
  } catch (error) {
    logApiError('ORDERS', 'APPROVE_REFUND', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
