import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/dashboard');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const queries = await Promise.all([
      query(`SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as amount FROM orders WHERE DATE(created_at) = DATE('now')`),
      query(`SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as amount FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`),
      query(`SELECT COUNT(*) as count FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')`),
      query(`SELECT COUNT(*) as count FROM users`),
      query(`SELECT COUNT(*) as count FROM products`),
      query(`SELECT COUNT(*) as count FROM inventory WHERE quantity <= 5 AND quantity > 0`),
      query(`SELECT COUNT(*) as count FROM inventory WHERE quantity <= 0`),
      query(`SELECT COUNT(*) as count FROM orders WHERE order_status = 'pending'`),
      query(`SELECT COUNT(*) as count FROM orders WHERE order_status = 'refunding'`),
      query(`SELECT o.id, o.order_number, o.final_amount, o.order_status, o.payment_status, o.created_at, u.name as user_name FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 10`),
    ]);

    const todayOrders = queries[0].rows[0] || { count: 0, amount: 0 };
    const monthOrders = queries[1].rows[0] || { count: 0, amount: 0 };
    const lastMonthCount = queries[2].rows[0]?.count || 0;
    const totalUsers = queries[3].rows[0]?.count || 0;
    const totalProducts = queries[4].rows[0]?.count || 0;
    const lowStock = queries[5].rows[0]?.count || 0;
    const outOfStock = queries[6].rows[0]?.count || 0;
    const pendingOrders = queries[7].rows[0]?.count || 0;
    const pendingRefunds = queries[8].rows[0]?.count || 0;
    const recentOrders = queries[9].rows;

    const monthGrowth = lastMonthCount > 0
      ? ((monthOrders.count - lastMonthCount) / lastMonthCount * 100).toFixed(1)
      : 'N/A';

    logApiSuccess('API', 'GET_DASHBOARD');
    return createSuccessResponse({
      todayOrders: { count: todayOrders.count, amount: Number(todayOrders.amount) || 0 },
      monthOrders: { count: monthOrders.count, amount: Number(monthOrders.amount) || 0 },
      monthGrowth,
      totalUsers,
      totalProducts,
      lowStock,
      outOfStock,
      pendingOrders,
      pendingRefunds,
      recentOrders
    });
  } catch (error) {
    logApiError('API', 'GET_DASHBOARD', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
