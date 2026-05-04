import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const userId = parseInt(id);
    logApiRequest('AUTH', 'GET', `/api/admin/users/${userId}`);

    const [userResult, orderCount, couponCount, favoriteCount, pointsResult] = await Promise.all([
      query('SELECT id, name, email, phone, role, level, points, total_spent, created_at FROM users WHERE id = ?', [userId]),
      query('SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total_amount FROM orders WHERE user_id = ?', [userId]),
      query('SELECT COUNT(*) as count FROM user_coupons WHERE user_id = ?', [userId]),
      query('SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?', [userId]),
      query('SELECT * FROM points_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]),
    ]);

    if (userResult.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const recentOrders = await query(
      'SELECT id, order_number, final_amount, order_status, payment_status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    const recentCoupons = await query(
      `SELECT uc.*, c.code, c.name, c.type, c.value FROM user_coupons uc
       LEFT JOIN coupons c ON uc.coupon_id = c.id
       WHERE uc.user_id = ? ORDER BY uc.created_at DESC LIMIT 10`,
      [userId]
    );

    logApiSuccess('AUTH', 'GET_USER_DETAIL', { userId });
    return createSuccessResponse({
      user: userResult.rows[0],
      stats: {
        orderCount: orderCount.rows[0]?.count || 0,
        totalSpent: orderCount.rows[0]?.total_amount || 0,
        couponCount: couponCount.rows[0]?.count || 0,
        favoriteCount: favoriteCount.rows[0]?.count || 0,
      },
      recentOrders: recentOrders.rows,
      recentCoupons: recentCoupons.rows,
      pointsLogs: pointsResult.rows
    });
  } catch (error) {
    logApiError('AUTH', 'GET_USER_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const userId = parseInt(id);
    logApiRequest('AUTH', 'PUT', `/api/admin/users/${userId}`);

    const body = await request.json();
    const { name, role, phone, points } = body;

    const existing = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); paramsArr.push(name); }
    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) return createErrorResponse('VALIDATION_FAILED', 400);
      updates.push('role = ?'); paramsArr.push(role);
    }
    if (phone !== undefined) { updates.push('phone = ?'); paramsArr.push(phone); }
    if (points !== undefined) { updates.push('points = ?'); paramsArr.push(points); }

    if (updates.length === 0) return createErrorResponse('NO_CHANGES', 400);

    paramsArr.push(userId);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

    const updated = await query('SELECT id, name, email, phone, role, level, points, total_spent FROM users WHERE id = ?', [userId]);
    logApiSuccess('AUTH', 'UPDATE_USER', { userId });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('AUTH', 'UPDATE_USER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
