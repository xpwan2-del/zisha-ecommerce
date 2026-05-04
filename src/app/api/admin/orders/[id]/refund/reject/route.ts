import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

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

    if (cur.order_status !== 'refunding') return createErrorResponse('INVALID_ORDER_STATUS', 400);

    await query("UPDATE orders SET order_status = 'paid', updated_at = datetime('now') WHERE id = ?", [orderId]);

    await query(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, change_reason, changed_by, created_at, order_number, operator_type, operator_name)
       VALUES (?, 'refunding', 'paid', ?, ?, datetime('now'), ?, 'admin', ?)`,
      [orderId, reason || '管理员拒绝退款', operatorId, cur.order_number, operatorName]
    );

    logApiSuccess('ORDERS', 'REJECT_REFUND', { orderId, reason });
    return createSuccessResponse({ message: '退款申请已拒绝' });
  } catch (error) {
    logApiError('ORDERS', 'REJECT_REFUND', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
