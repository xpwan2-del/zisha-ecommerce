import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PAYMENTS', 'GET', '/api/admin/payments/orders');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('status') || '';
    const paymentMethod = searchParams.get('method') || '';

    let whereClauses: string[] = ['o.payment_status IS NOT NULL'];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(o.order_number LIKE ? OR u.email LIKE ? OR u.name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (paymentStatus) { 
      whereClauses.push('o.payment_status = ?'); 
      params.push(paymentStatus); 
    }
    if (paymentMethod) { 
      whereClauses.push('o.payment_method = ?'); 
      params.push(paymentMethod); 
    }

    const whereSQL = 'WHERE ' + whereClauses.join(' AND ');
    const countResult = await query(`SELECT COUNT(*) as total FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT o.id, o.order_number, o.order_status, o.payment_status, o.final_amount, o.payment_method,
              o.reference_id, o.paid_at, o.created_at, o.updated_at, u.name as user_name, u.email as user_email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereSQL}
       ORDER BY o.updated_at DESC, o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('PAYMENTS', 'GET_PAYMENT_ORDERS', { total, page });
    return createSuccessResponse({ 
      orders: result.rows, 
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    logApiError('PAYMENTS', 'GET_PAYMENT_ORDERS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
