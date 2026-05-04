import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

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

    if (cur.order_status !== 'paid' && cur.payment_status !== 'paid') {
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    await query(
      `INSERT INTO order_logistics (order_id, tracking_number, carrier, status, estimated_delivery, created_at, updated_at)
       VALUES (?, ?, ?, 'shipped', ?, datetime('now'), datetime('now'))`,
      [orderId, tracking_number, carrier, estimated_delivery || null]
    );

    await query("UPDATE orders SET order_status = 'shipped', updated_at = datetime('now') WHERE id = ?", [orderId]);

    await query(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, change_reason, changed_by, created_at, order_number, operator_type, operator_name)
       VALUES (?, ?, 'shipped', ?, ?, datetime('now'), ?, 'admin', ?)`,
      [orderId, cur.order_status, `发货: ${carrier} ${tracking_number}`, operatorId, cur.order_number, operatorName]
    );

    logApiSuccess('ORDERS', 'SHIP_ORDER', { orderId, tracking_number, carrier });
    return createSuccessResponse({ message: '发货成功', tracking_number, carrier });
  } catch (error) {
    logApiError('ORDERS', 'SHIP_ORDER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
