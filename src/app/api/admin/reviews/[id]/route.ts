import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const reviewId = parseInt(id);
    logApiRequest('PRODUCTS', 'GET', `/api/admin/reviews/${reviewId}`);

    const r = await query(`SELECT r.*, u.name as user_name, u.email as user_email, pro.name as product_name, pro.id as product_id FROM reviews r LEFT JOIN users u ON r.user_id = u.id LEFT JOIN products pro ON r.product_id = pro.id WHERE r.id = ?`, [reviewId]);
    if (r.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const [replies, helpful] = await Promise.all([
      query('SELECT rr.*, u.name as user_name FROM review_replies rr LEFT JOIN users u ON rr.user_id = u.id WHERE rr.review_id = ? ORDER BY rr.created_at ASC', [reviewId]),
      query(`SELECT COALESCE(SUM(CASE WHEN is_helpful = 1 THEN 1 ELSE 0 END), 0) as helpful_count, COALESCE(SUM(CASE WHEN is_helpful = 0 THEN 1 ELSE 0 END), 0) as not_helpful_count FROM review_helpful WHERE review_id = ?`, [reviewId])
    ]);

    logApiSuccess('PRODUCTS', 'GET_REVIEW_DETAIL', { reviewId });
    return createSuccessResponse({ review: r.rows[0], replies: replies.rows, helpful: helpful.rows[0] || { helpful_count: 0, not_helpful_count: 0 } });
  } catch (error) {
    logApiError('PRODUCTS', 'GET_REVIEW_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const reviewId = parseInt(id);
    logApiRequest('PRODUCTS', 'PUT', `/api/admin/reviews/${reviewId}`);

    const { status } = await request.json();
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) return createErrorResponse('VALIDATION_FAILED', 400);

    const ex = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (ex.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    await query('UPDATE reviews SET status = ? WHERE id = ?', [status, reviewId]);
    logApiSuccess('PRODUCTS', 'UPDATE_REVIEW_STATUS', { reviewId, status });
    return createSuccessResponse({ message: '审核状态已更新', status });
  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_REVIEW_STATUS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const reviewId = parseInt(id);
    logApiRequest('PRODUCTS', 'DELETE', `/api/admin/reviews/${reviewId}`);

    await query('DELETE FROM review_replies WHERE review_id = ?', [reviewId]);
    await query('DELETE FROM review_helpful WHERE review_id = ?', [reviewId]);
    await query('DELETE FROM reviews WHERE id = ?', [reviewId]);
    logApiSuccess('PRODUCTS', 'DELETE_REVIEW', { reviewId });
    return createSuccessResponse({ message: '评价已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_REVIEW', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
