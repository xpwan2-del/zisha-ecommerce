import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const reviewId = parseInt(id);
    logApiRequest('PRODUCTS', 'POST', `/api/admin/reviews/${reviewId}/reply`);

    const userId = auth.user.userId;
    const body = await request.json();
    const { content, content_en, content_ar } = body;

    if (!content) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const existing = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const result = await query(
      `INSERT INTO review_replies (review_id, user_id, content, content_en, content_ar, is_admin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [reviewId, userId, content, content_en || '', content_ar || '']
    );

    if (existing.rows[0].status === 'pending') {
      await query('UPDATE reviews SET status = ? WHERE id = ?', ['approved', reviewId]);
    }

    logApiSuccess('PRODUCTS', 'ADD_REVIEW_REPLY', { reviewId, replyId: result.lastInsertRowid });
    return createSuccessResponse({ id: result.lastInsertRowid, content }, 201);
  } catch (error) {
    logApiError('PRODUCTS', 'ADD_REVIEW_REPLY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
