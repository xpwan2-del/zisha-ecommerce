import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('ORDERS', 'GET', '/api/admin/orders');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const orderStatus = searchParams.get('orderStatus') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(o.order_number LIKE ? OR u.email LIKE ? OR u.name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (orderStatus) { whereClauses.push('o.order_status = ?'); params.push(orderStatus); }
    if (paymentStatus) { whereClauses.push('o.payment_status = ?'); params.push(paymentStatus); }
    if (startDate) { whereClauses.push('o.created_at >= ?'); params.push(startDate); }
    if (endDate) { whereClauses.push("o.created_at <= ?"); params.push(endDate + ' 23:59:59'); }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const countResult = await query(`SELECT COUNT(*) as total FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT o.id, o.order_number, o.order_status, o.payment_status, o.final_amount, o.total_original_price,
              o.shipping_fee, o.total_coupon_discount, o.order_final_discount_amount, o.payment_method,
              o.coupon_ids, o.created_at, o.updated_at, u.name as user_name, u.email as user_email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereSQL}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('ORDERS', 'GET_ORDERS_LIST', { total, page, limit });
    return createSuccessResponse({ orders: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logApiError('ORDERS', 'GET_ORDERS_LIST', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
