import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/analytics/dashboard');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const queries = await Promise.all([
      query(`SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(final_amount), 0) as revenue
             FROM orders WHERE created_at >= DATE('now', '-7 days') GROUP BY DATE(created_at) ORDER BY date`),
      query(`SELECT DATE(created_at) as date, COUNT(*) as count
             FROM users WHERE created_at >= DATE('now', '-7 days') GROUP BY DATE(created_at) ORDER BY date`),
      query(`SELECT p.name, COUNT(o.id) as count, COALESCE(SUM(o.final_amount), 0) as total
             FROM orders o JOIN products p ON 1=1 WHERE o.id > 0 LIMIT 20`),
      query(`SELECT payment_method, COUNT(*) as count FROM orders WHERE payment_method IS NOT NULL GROUP BY payment_method`),
    ]);

    logApiSuccess('API', 'GET_ANALYTICS_DASHBOARD');
    return createSuccessResponse({
      dailySales: queries[0].rows,
      dailyUsers: queries[1].rows,
      topProducts: queries[2].rows,
      paymentDistribution: queries[3].rows
    });
  } catch (error) {
    logApiError('API', 'GET_ANALYTICS_DASHBOARD', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
