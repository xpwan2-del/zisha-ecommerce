import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const couponId = parseInt(id);
    logApiRequest('ORDERS', 'PUT', `/api/admin/coupons/${couponId}/toggle`);

    const existing = await query('SELECT id, is_active, code FROM coupons WHERE id = ?', [couponId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const newActive = existing.rows[0].is_active ? 0 : 1;
    await query('UPDATE coupons SET is_active = ? WHERE id = ?', [newActive, couponId]);

    logApiSuccess('ORDERS', 'TOGGLE_COUPON', { couponId, code: existing.rows[0].code, is_active: !!newActive });
    return createSuccessResponse({ is_active: !!newActive });
  } catch (error) {
    logApiError('ORDERS', 'TOGGLE_COUPON', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
