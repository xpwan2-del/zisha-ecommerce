import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('INVENTORY', 'GET', '/api/admin/inventory');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query(
      `SELECT i.*, p.name as product_full_name, p.name_en as product_name_en,
              ist.name as status_name, ist.color as status_color
       FROM inventory i
       LEFT JOIN products p ON i.product_id = p.id
       LEFT JOIN inventory_status ist ON i.status_id = ist.id
       ORDER BY i.quantity ASC`
    );

    logApiSuccess('INVENTORY', 'GET_INVENTORY', { count: result.rows.length });
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('INVENTORY', 'GET_INVENTORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
