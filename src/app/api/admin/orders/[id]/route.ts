import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog, ensureAuditLogsTable } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { getLatestFailedRefundWebhookEvent } from '@/lib/payment/refund-webhook-service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const orderId = parseInt(id);
    logApiRequest('ORDERS', 'GET', `/api/admin/orders/${orderId}`);

    await ensureAuditLogsTable();

    const orderResult = await query(
      `SELECT o.*, u.name as user_name, u.email as user_email,
              a.contact_name as address_contact, a.phone as address_phone,
              a.street_address, a.city, a.state_name, a.country_name, a.postal_code
       FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN addresses a ON o.shipping_address_id = a.id WHERE o.id = ?`,
      [orderId]
    );
    if (orderResult.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const [statusLogs, payments, logistics, coupons, items, inventoryTransactions, auditLogs, releaseRecords] = await Promise.all([
      query('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY created_at DESC', [orderId]),
      query('SELECT * FROM order_payments WHERE order_id = ?', [orderId]),
      query('SELECT * FROM order_logistics WHERE order_id = ?', [orderId]),
      query(`SELECT oc.*, uc.coupon_id as coupon_def_id, c.code as coupon_code, c.name as coupon_name, c.type as coupon_type, c.value as coupon_value
             FROM order_coupons oc
             LEFT JOIN user_coupons uc ON oc.coupon_id = uc.id
             LEFT JOIN coupons c ON uc.coupon_id = c.id WHERE oc.order_id = ?`, [orderId]),
      query(`SELECT oi.*, oi.id as order_item_id, p.name as product_name, p.name_en as product_name_en,
                    p.name_ar as product_name_ar, p.image as product_image
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC`, [orderId]),
      query(`SELECT it.id, it.product_id, it.product_name, it.quantity_change, it.quantity_before, it.quantity_after,
                    it.reason, it.reference_type, it.reference_id, it.operator_name, it.created_at,
                    tt.code as transaction_code, tt.name_zh as transaction_name_zh, tt.name_en as transaction_name_en
             FROM inventory_transactions it
             LEFT JOIN transaction_type tt ON it.transaction_type_id = tt.id
             WHERE it.reference_type = 'order' AND it.reference_id = ?
             ORDER BY it.created_at DESC`, [orderId]),
      query(`SELECT id, module, action, description, operator, status, error_message, risk_level,
                    resource_id, resource_type, metadata, created_at
             FROM audit_logs
             WHERE resource_type = 'order' AND resource_id = ?
             ORDER BY created_at DESC`, [String(orderId)]),
      query(`SELECT id, order_id, reference_type, transaction_type_code, items_released, coupons_released, operator_name, created_at
             FROM order_resource_releases
             WHERE order_id = ?
             ORDER BY created_at DESC`, [orderId])
    ]);

    logApiSuccess('ORDERS', 'GET_ORDER_DETAIL', { orderId, orderNumber: orderResult.rows[0].order_number });
    const latestFailedRefundWebhook = await getLatestFailedRefundWebhookEvent(String(orderResult.rows[0].order_number || ''));
    return createSuccessResponse({
      order: orderResult.rows[0],
      items: items.rows,
      statusLogs: statusLogs.rows,
      payments: payments.rows,
      logistics: logistics.rows,
      coupons: coupons.rows,
      inventoryTransactions: inventoryTransactions.rows,
      auditLogs: auditLogs.rows,
      releaseRecords: releaseRecords.rows,
      refundRetry: latestFailedRefundWebhook ? {
        canRetry: orderResult.rows[0].order_status === 'refunding' || orderResult.rows[0].order_status === 'refunded',
        eventId: latestFailedRefundWebhook.event_id,
        platform: latestFailedRefundWebhook.platform,
        failureStage: latestFailedRefundWebhook.failure_stage,
        processingState: latestFailedRefundWebhook.processing_state,
        retryCount: latestFailedRefundWebhook.retry_count || 0,
        lastRetryAt: latestFailedRefundWebhook.last_retry_at,
        errorMessage: latestFailedRefundWebhook.error_message,
        updatedAt: latestFailedRefundWebhook.updated_at,
      } : null,
    });
  } catch (error) {
    logApiError('ORDERS', 'GET_ORDER_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const orderId = parseInt(id);
    logApiRequest('ORDERS', 'PUT', `/api/admin/orders/${orderId}`);

    const body = await request.json();
    const { order_status, payment_status, payment_method, shipping_address_id, notes } = body;

    if (order_status !== undefined) {
      return createErrorResponse('ORDER_STATUS_UPDATE_REQUIRES_STATE_MACHINE', 400);
    }

    const current = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (current.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const vals: any[] = [];
    if (payment_status !== undefined) { updates.push('payment_status = ?'); vals.push(payment_status); }
    if (payment_method !== undefined) { updates.push('payment_method = ?'); vals.push(payment_method); }
    if (shipping_address_id !== undefined) { updates.push('shipping_address_id = ?'); vals.push(shipping_address_id); }
    if (notes !== undefined) { updates.push('notes = ?'); vals.push(notes); }

    if (updates.length === 0) return createErrorResponse('NO_CHANGES', 400);
    updates.push("updated_at = datetime('now')");
    vals.push(orderId);
    await query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, vals);

    const updated = await query('SELECT * FROM orders WHERE id = ?', [orderId]);

    await recordAdminAuditLog({
      request,
      module: 'ORDERS',
      action: 'UPDATE_ORDER',
      description: '管理员编辑订单信息',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: orderId,
      resourceType: 'order',
      riskLevel: 'critical',
      metadata: {
        orderNumber: current.rows[0].order_number,
        changes: body,
      },
    });

    logApiSuccess('ORDERS', 'UPDATE_ORDER', { orderId, changes: updates.join(', ') });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('ORDERS', 'UPDATE_ORDER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
