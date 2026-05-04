import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/reviews');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const rating = parseInt(searchParams.get('rating') || '0');
    const productId = parseInt(searchParams.get('productId') || '0');

    let w: string[] = []; let p: any[] = [];
    if (search) { w.push('(r.comment LIKE ? OR u.name LIKE ? OR p.name LIKE ?)'); const s = `%${search}%`; p.push(s, s, s); }
    if (status === 'pending') w.push("r.status = 'pending'");
    if (status === 'approved') w.push("r.status = 'approved'");
    if (status === 'rejected') w.push("r.status = 'rejected'");
    if (rating > 0) { w.push('r.rating = ?'); p.push(rating); }
    if (productId > 0) { w.push('r.product_id = ?'); p.push(productId); }

    const wSQL = w.length > 0 ? 'WHERE ' + w.join(' AND ') : '';

    const ct = await query(`SELECT COUNT(*) as total FROM reviews r LEFT JOIN users u ON r.user_id = u.id LEFT JOIN products pro ON r.product_id = pro.id ${wSQL}`, p);
    const total = ct.rows[0]?.total || 0;
    const offset = (page - 1) * limit;

    const r = await query(
      `SELECT r.*, u.name as user_name, u.email as user_email, pro.name as product_name, pro.name_en as product_name_en,
              (SELECT COUNT(*) FROM review_replies WHERE review_id = r.id) as reply_count
       FROM reviews r LEFT JOIN users u ON r.user_id = u.id LEFT JOIN products pro ON r.product_id = pro.id
       ${wSQL} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...p, limit, offset]
    );

    logApiSuccess('PRODUCTS', 'GET_REVIEWS', { total });
    return createSuccessResponse({ reviews: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logApiError('PRODUCTS', 'GET_REVIEWS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
