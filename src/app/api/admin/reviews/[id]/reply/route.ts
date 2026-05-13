import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

const MAX_REVIEW_REPLY_LENGTH = 2000;

function validateReplyText(value: unknown, required = false) {
  if (value === undefined || value === null) return required ? 'MISSING_PARAMS' : null;
  if (typeof value !== 'string') return 'INVALID_REPLY_CONTENT';
  const trimmed = value.trim();
  if (required && !trimmed) return 'MISSING_PARAMS';
  if (trimmed.length > MAX_REVIEW_REPLY_LENGTH) return 'REPLY_CONTENT_TOO_LONG';
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const reviewId = parseInt(id);
    logApiRequest('PRODUCTS', 'POST', `/api/admin/reviews/${reviewId}/reply`);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return createErrorResponse('INVALID_REVIEW_ID', 400);
    }

    const userId = auth.user.userId;
    const body = await request.json();
    const { content, content_en, content_ar } = body;

    const validationError = validateReplyText(content, true) || validateReplyText(content_en) || validateReplyText(content_ar);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    const existing = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const result = await query(
      `INSERT INTO review_replies (review_id, user_id, content, content_en, content_ar, is_admin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [reviewId, userId, content.trim(), content_en?.trim() || '', content_ar?.trim() || '']
    );

    if (existing.rows[0].status === 'pending') {
      await query('UPDATE reviews SET status = ? WHERE id = ?', ['approved', reviewId]);
    }

    await recordAdminAuditLog({
      request,
      module: 'REVIEWS',
      action: 'ADD_REVIEW_REPLY',
      description: `管理员新增评论回复: ${reviewId}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: Number(result.lastInsertRowid || 0),
      resourceType: 'review_reply',
      riskLevel: 'medium',
      metadata: { reviewId, replyId: result.lastInsertRowid, approvedReview: existing.rows[0].status === 'pending' }
    });

    logApiSuccess('PRODUCTS', 'ADD_REVIEW_REPLY', { reviewId, replyId: result.lastInsertRowid });
    return createSuccessResponse({ id: result.lastInsertRowid, content: content.trim() }, 201);
  } catch (error) {
    logApiError('PRODUCTS', 'ADD_REVIEW_REPLY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
