import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const couponId = parseInt(id);
    logApiRequest('ORDERS', 'GET', `/api/admin/coupons/${couponId}`);

    const coupon = await query('SELECT * FROM coupons WHERE id = ?', [couponId]);
    if (coupon.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const claimedRes = await query('SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = ?', [couponId]);
    const usedRes = await query("SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = ? AND status = 'used'", [couponId]);
    const stats = await query(`SELECT COUNT(DISTINCT oc.order_id) as order_count, COALESCE(SUM(oc.discount_applied), 0) as total_discount FROM order_coupons oc WHERE oc.coupon_id = ?`, [couponId]);

    const claimed = claimedRes.rows[0]?.count || 0;
    const used = usedRes.rows[0]?.count || 0;

    logApiSuccess('ORDERS', 'GET_COUPON_DETAIL', { couponId, code: coupon.rows[0].code });
    return createSuccessResponse({
      coupon: coupon.rows[0],
      stats: { totalClaimed: claimed, totalUsed: used, orderCount: stats.rows[0]?.order_count || 0, totalDiscount: stats.rows[0]?.total_discount || 0 }
    });
  } catch (error) {
    logApiError('ORDERS', 'GET_COUPON_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const couponId = parseInt(id);
    logApiRequest('ORDERS', 'PUT', `/api/admin/coupons/${couponId}`);

    const body = await request.json();
    const { name, type, value, start_date, end_date, usage_limit, is_permanent, permanent_days, is_stackable, is_active, description } = body;

    const ex = await query('SELECT * FROM coupons WHERE id = ?', [couponId]);
    if (ex.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const u: string[] = []; const p: any[] = [];
    if (name !== undefined) { u.push('name = ?'); p.push(name); }
    if (type !== undefined) { u.push('type = ?'); p.push(type); }
    if (value !== undefined) { u.push('value = ?'); p.push(value); }
    if (start_date !== undefined) { u.push('start_date = ?'); p.push(start_date); }
    if (end_date !== undefined) { u.push('end_date = ?'); p.push(end_date); }
    if (usage_limit !== undefined) { u.push('usage_limit = ?'); p.push(usage_limit); }
    if (is_permanent !== undefined) { u.push('is_permanent = ?'); p.push(is_permanent ? 1 : 0); }
    if (permanent_days !== undefined) { u.push('permanent_days = ?'); p.push(permanent_days); }
    if (is_stackable !== undefined) { u.push('is_stackable = ?'); p.push(is_stackable ? 1 : 0); }
    if (is_active !== undefined) { u.push('is_active = ?'); p.push(is_active ? 1 : 0); }
    if (description !== undefined) { u.push('description = ?'); p.push(description); }

    if (u.length === 0) return createErrorResponse('NO_CHANGES', 400);
    p.push(couponId);
    await query(`UPDATE coupons SET ${u.join(', ')} WHERE id = ?`, p);

    const updated = await query('SELECT * FROM coupons WHERE id = ?', [couponId]);
    logApiSuccess('ORDERS', 'UPDATE_COUPON', { couponId, code: updated.rows[0].code });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('ORDERS', 'UPDATE_COUPON', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const couponId = parseInt(id);
    logApiRequest('ORDERS', 'DELETE', `/api/admin/coupons/${couponId}`);

    await query('DELETE FROM order_coupons WHERE coupon_id = ?', [couponId]);
    await query('DELETE FROM user_coupons WHERE coupon_id = ?', [couponId]);
    await query('DELETE FROM coupons WHERE id = ?', [couponId]);

    logApiSuccess('ORDERS', 'DELETE_COUPON', { couponId });
    return createSuccessResponse({ message: '优惠券已删除' });
  } catch (error) {
    logApiError('ORDERS', 'DELETE_COUPON', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
