import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const orderId = parseInt(id);
    logApiRequest('ORDERS', 'GET', `/api/admin/orders/${orderId}`);

    const orderResult = await query(
      `SELECT o.*, u.name as user_name, u.email as user_email,
              a.contact_name as address_contact, a.phone as address_phone,
              a.street_address, a.city, a.state_name, a.country_name, a.postal_code
       FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN addresses a ON o.shipping_address_id = a.id WHERE o.id = ?`,
      [orderId]
    );
    if (orderResult.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const [statusLogs, payments, logistics, coupons] = await Promise.all([
      query('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY created_at DESC', [orderId]),
      query('SELECT * FROM order_payments WHERE order_id = ?', [orderId]),
      query('SELECT * FROM order_logistics WHERE order_id = ?', [orderId]),
      query(`SELECT oc.*, c.code as coupon_code, c.name as coupon_name, c.type as coupon_type, c.value as coupon_value
             FROM order_coupons oc LEFT JOIN coupons c ON oc.coupon_id = c.id WHERE oc.order_id = ?`, [orderId])
    ]);

    logApiSuccess('ORDERS', 'GET_ORDER_DETAIL', { orderId, orderNumber: orderResult.rows[0].order_number });
    return createSuccessResponse({ order: orderResult.rows[0], statusLogs: statusLogs.rows, payments: payments.rows, logistics: logistics.rows, coupons: coupons.rows });
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
    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    const current = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (current.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);
    const old = current.rows[0];

    const updates: string[] = [];
    const vals: any[] = [];
    if (order_status !== undefined) { updates.push('order_status = ?'); vals.push(order_status); }
    if (payment_status !== undefined) { updates.push('payment_status = ?'); vals.push(payment_status); }
    if (payment_method !== undefined) { updates.push('payment_method = ?'); vals.push(payment_method); }
    if (shipping_address_id !== undefined) { updates.push('shipping_address_id = ?'); vals.push(shipping_address_id); }
    if (notes !== undefined) { updates.push('notes = ?'); vals.push(notes); }

    if (updates.length === 0) return createErrorResponse('NO_CHANGES', 400);
    updates.push("updated_at = datetime('now')");
    vals.push(orderId);
    await query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, vals);

    if (order_status !== undefined && order_status !== old.order_status) {
      await query(
        `INSERT INTO order_status_logs (order_id, old_status, new_status, change_reason, changed_by, created_at, order_number, operator_type, operator_name)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?, 'admin', ?)`,
        [orderId, old.order_status, order_status, '管理员手动修改', operatorId, old.order_number, operatorName]
      );
    }

    const updated = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    logApiSuccess('ORDERS', 'UPDATE_ORDER', { orderId, changes: updates.join(', ') });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('ORDERS', 'UPDATE_ORDER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
