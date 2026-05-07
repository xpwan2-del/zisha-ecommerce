import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { releaseOrderResources } from '@/lib/order-release-service';
import { InventoryTransactionCode } from '@/lib/inventory-transactions';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

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

    if (cur.order_status !== 'refunding') return createErrorResponse('INVALID_ORDER_STATUS', 400);

    await query("UPDATE orders SET order_status = 'refunded', payment_status = 'refunded', updated_at = datetime('now') WHERE id = ?", [orderId]);

    await releaseOrderResources({
      orderId,
      userId: cur.user_id,
      transactionTypeCode: InventoryTransactionCode.REFUND_RETURN,
      inventoryReason: '退款完成，归还库存',
      referenceType: 'refund',
      operatorId,
      operatorName,
    });

    await query(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, change_reason, changed_by, created_at, order_number, operator_type, operator_name)
       VALUES (?, 'refunding', 'refunded', '管理员同意退款', ?, datetime('now'), ?, 'admin', ?)`,
      [orderId, operatorId, cur.order_number, operatorName]
    );

    const ocs = await query("SELECT * FROM order_coupons WHERE order_id = ? AND status = 'used'", [orderId]);
    for (const oc of ocs.rows) {
      await query("UPDATE user_coupons SET status = 'active', used_order_id = NULL WHERE id = ? AND coupon_id = ?", [oc.user_id, oc.coupon_id]);
      await query("UPDATE order_coupons SET status = 'refunded', refunded_at = datetime('now') WHERE id = ?", [oc.id]);
    }

    logApiSuccess('ORDERS', 'APPROVE_REFUND', { orderId, orderNumber: cur.order_number });
    return createSuccessResponse({ message: '退款已处理' });
  } catch (error) {
    logApiError('ORDERS', 'APPROVE_REFUND', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
