import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { OrderEvent, OrderStatusService } from '@/lib/order-status-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  let transactionStarted = false;

  try {
    const { id } = await params;
    const orderId = parseInt(id);
    logApiRequest('ORDERS', 'POST', `/api/admin/orders/${orderId}/ship`);

    const body = await request.json();
    const { tracking_number, carrier, estimated_delivery } = body;
    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    if (!tracking_number || !carrier) return createErrorResponse('MISSING_PARAMS', 400);

    const order = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (order.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);
    const cur = order.rows[0];

    if (cur.order_status !== 'paid' || cur.payment_status !== 'paid') {
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    await query('BEGIN TRANSACTION');
    transactionStarted = true;

    const statusChange = await OrderStatusService.changeStatus(
      orderId,
      OrderEvent.MERCHANT_SHIP,
      {
        type: 'admin',
        id: operatorId,
        name: operatorName,
      },
      {
        reason: `发货: ${carrier} ${tracking_number}`,
        useExistingTransaction: true,
      }
    );

    if (!statusChange.success) {
      await query('ROLLBACK');
      transactionStarted = false;
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    await query(
      `INSERT INTO order_logistics (order_id, tracking_number, carrier, status, estimated_delivery, created_at, updated_at)
       VALUES (?, ?, ?, 'shipped', ?, datetime('now'), datetime('now'))`,
      [orderId, tracking_number, carrier, estimated_delivery || null]
    );

    await query('COMMIT');
    transactionStarted = false;

    await recordAdminAuditLog({
      request,
      module: 'ORDERS',
      action: 'SHIP_ORDER',
      description: '管理员订单发货',
      operator: operatorName,
      status: 'success',
      resourceId: orderId,
      resourceType: 'order',
      riskLevel: 'high',
      metadata: {
        orderNumber: cur.order_number,
        tracking_number,
        carrier,
        estimated_delivery: estimated_delivery || null,
        fromStatus: statusChange.fromStatus,
        toStatus: statusChange.toStatus,
      },
    });

    logApiSuccess('ORDERS', 'SHIP_ORDER', {
      orderId,
      tracking_number,
      carrier,
      fromStatus: statusChange.fromStatus,
      toStatus: statusChange.toStatus,
    });
    return createSuccessResponse({
      message: '发货成功',
      tracking_number,
      carrier,
      order_status: statusChange.toStatus,
    });
  } catch (error) {
    if (transactionStarted) {
      await query('ROLLBACK');
    }
    logApiError('ORDERS', 'SHIP_ORDER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
