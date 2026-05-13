import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/analytics/sales');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    let dateGroupExpr = "strftime('%Y-%m', created_at)";
    if (period === 'week') dateGroupExpr = "strftime('%Y-%W', created_at)";
    if (period === 'day') dateGroupExpr = "DATE(created_at)";

    const result = await query(
      `SELECT ${dateGroupExpr} as period,
              COUNT(*) as order_count,
              COALESCE(SUM(final_amount), 0) as total_revenue,
              COALESCE(AVG(final_amount), 0) as avg_order_value
       FROM orders
       WHERE order_status NOT IN ('cancelled', 'refunded')
       GROUP BY period ORDER BY period DESC LIMIT 24`
    );

    logApiSuccess('API', 'GET_SALES_ANALYTICS');
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('API', 'GET_SALES_ANALYTICS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
